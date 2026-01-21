'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ListingContext } from './ListingContext';
import { RefreshCw as Loader2, AlertCircle, Archive, ArrowLeft } from 'griddy-icons';
import { Button } from '@second-turn/design-system';
import type { Message, Conversation } from '@/lib/types/message';
import Link from 'next/link';

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Fetch conversation and messages
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/messages/${conversationId}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load conversation');
        }

        const data = await response.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);

        // Scroll to bottom after loading
        setTimeout(() => scrollToBottom(false), 100);

        // Mark messages as read
        if (data.messages && data.messages.length > 0) {
          const lastMessage = data.messages[data.messages.length - 1];
          markAsRead(lastMessage.id);
        }
      } catch (err: unknown) {
        console.error('Error fetching conversation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
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

          // Don't add if it's our own message (optimistic update already added it)
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;

            // Add sender info if available from conversation
            const otherUserId =
              conversation.buyer_id === user?.id
                ? conversation.seller_id
                : conversation.buyer_id;

            const messageWithSender = {
              ...newMessage,
              sender:
                newMessage.sender_id === user?.id
                  ? {
                      id: user.id,
                      full_name: null,
                      avatar_url: null,
                    }
                  : {
                      id: otherUserId,
                      full_name:
                        conversation.buyer_id === user?.id
                          ? conversation.seller_profile?.full_name || null
                          : conversation.buyer_profile?.full_name || null,
                      avatar_url:
                        conversation.buyer_id === user?.id
                          ? conversation.seller_profile?.avatar_url || null
                          : conversation.buyer_profile?.avatar_url || null,
                    },
            };

            return [...prev, messageWithSender];
          });

          // Scroll to bottom for new messages
          setTimeout(() => scrollToBottom(true), 100);

          // Mark as read if not own message
          if (newMessage.sender_id !== user?.id) {
            markAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation, conversationId, user?.id]);

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      await fetch(`/api/messages/${conversationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      is_system_message: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      sender: {
        id: user.id,
        full_name: null,
        avatar_url: null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id ? data.message : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );

      throw error;
    }
  };

  const handleArchive = async () => {
    if (!conversation) return;

    const isArchived =
      conversation.buyer_id === user?.id
        ? !!conversation.buyer_archived_at
        : !!conversation.seller_archived_at;

    try {
      setArchiving(true);

      const response = await fetch(`/api/messages/${conversationId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !isArchived }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive conversation');
      }

      // Update local state
      setConversation((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          buyer_archived_at:
            prev.buyer_id === user?.id && !isArchived
              ? new Date().toISOString()
              : prev.buyer_archived_at,
          seller_archived_at:
            prev.seller_id === user?.id && !isArchived
              ? new Date().toISOString()
              : prev.seller_archived_at,
        };
      });
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-aurora-red" />
        <p className="text-text-primary text-center">
          {error || 'Conversation not found'}
        </p>
        <Link href="/messages">
          <Button variant="secondary">Back to Messages</Button>
        </Link>
      </div>
    );
  }

  const otherUser =
    conversation.buyer_id === user?.id
      ? conversation.seller_profile
      : conversation.buyer_profile;

  const isArchived =
    conversation.buyer_id === user?.id
      ? !!conversation.buyer_archived_at
      : !!conversation.seller_archived_at;

  return (
    <div className="flex flex-col h-full bg-background-primary">
      {/* Header */}
      <div className="border-b border-divider-subtle bg-background-secondary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="md:hidden">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {/* Other user avatar */}
            <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center text-text-primary font-medium overflow-hidden">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{otherUser?.full_name?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>

            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {otherUser?.full_name || 'Unknown User'}
              </h2>
              <p className="text-xs text-text-tertiary">
                {conversation.buyer_id === user?.id ? 'Seller' : 'Buyer'}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleArchive}
          disabled={archiving}
        >
          <Archive className="w-5 h-5 mr-2" />
          {isArchived ? 'Unarchive' : 'Archive'}
        </Button>
      </div>

      {/* Listing context */}
      <ListingContext conversation={conversation} />

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-text-secondary">No messages yet.</p>
            <p className="text-text-tertiary text-sm mt-2">
              Start the conversation by sending a message below.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={isArchived}
        placeholder={
          isArchived
            ? 'Unarchive to send messages'
            : 'Type your message...'
        }
      />
    </div>
  );
}
