'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Message } from '@/lib/types/message';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface UseOrderMessagesOptions {
  /** Supabase conversation ID — realtime subscription is skipped until non-null */
  conversationId: string | null;
  /** Currently authenticated user ID */
  currentUserId: string | null;
  /** Buyer profile for sender enrichment on realtime messages */
  buyerProfile: UserProfile | null;
  /** Seller profile for sender enrichment on realtime messages */
  sellerProfile: UserProfile | null;
}

export interface UseOrderMessagesReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sendingMessage: boolean;
  handleSendMessage: (content: string, photoUrls?: string[]) => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (smooth?: boolean) => void;
}

export function useOrderMessages({
  conversationId,
  currentUserId,
  buyerProfile,
  sellerProfile,
}: UseOrderMessagesOptions): UseOrderMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`order:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Message }) => {
          const newMessage = payload.new as Message;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;

            const messageWithSender = {
              ...newMessage,
              sender:
                newMessage.sender_id === buyerProfile?.id
                  ? buyerProfile
                  : newMessage.sender_id === sellerProfile?.id
                    ? sellerProfile
                    : null,
            };

            return [...prev, messageWithSender];
          });

          setTimeout(() => scrollToBottom(true), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, buyerProfile, sellerProfile, scrollToBottom]);

  // Handle sending messages with optimistic updates
  const handleSendMessage = useCallback(
    async (content: string, photoUrls?: string[]) => {
      if (!currentUserId || !conversationId) return;

      setSendingMessage(true);

      const currentProfile =
        currentUserId === buyerProfile?.id
          ? buyerProfile
          : currentUserId === sellerProfile?.id
            ? sellerProfile
            : null;

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        is_system_message: false,
        photo_urls: photoUrls || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        sender: currentProfile
          ? {
              id: currentProfile.id,
              full_name: currentProfile.full_name,
              avatar_url: currentProfile.avatar_url,
            }
          : null,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => scrollToBottom(true), 50);

      try {
        const response = await fetch(`/api/messages/${conversationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, photo_urls: photoUrls }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const result = await response.json();

        // Replace optimistic message with server response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? result.message : msg
          )
        );
      } catch (err) {
        console.error('Failed to send message:', err);
        // Rollback optimistic message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id)
        );
        throw err;
      } finally {
        setSendingMessage(false);
      }
    },
    [currentUserId, conversationId, buyerProfile, sellerProfile, scrollToBottom]
  );

  return {
    messages,
    setMessages,
    sendingMessage,
    handleSendMessage,
    messagesEndRef,
    messagesContainerRef,
    scrollToBottom,
  };
}
