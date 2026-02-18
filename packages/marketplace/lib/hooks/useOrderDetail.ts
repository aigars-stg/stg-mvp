'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Message } from '@/lib/types/message';
import type { TrackingEvent, ShippingDestination, TrackingData } from '@/components/shipping';

// Types
export interface OrderItem {
  id: string;
  listing_id: string;
  game_name: string;
  game_bgg_id?: number;
  price: number;
  condition: string;
  photo_url: string | null;
  game_thumbnail: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ConversationData {
  id: string;
  order_id: string | null;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

export interface OrderData {
  id: string;
  order_number: string;
  status: string;
  shipping_method: 't2t';
  total_amount: number;
  items_total: number;
  shipping_cost: number;
  refund_amount?: number | null;
  destination: ShippingDestination;
  tracking: TrackingData;
  timestamps: {
    created_at: string;
    paid_at?: string;
    seller_response_deadline?: string;
    seller_responded_at?: string;
    label_generated_at?: string;
    cancelled_at?: string;
    refunded_at?: string;
    disputed_at?: string;
  };
}

export interface TransactionData {
  conversation: ConversationData;
  messages: Message[];
  order: OrderData;
  order_items: OrderItem[];
  tracking_events: TrackingEvent[];
  buyer: UserProfile | null;
  seller: UserProfile | null;
  current_user: {
    id: string;
    role: 'buyer' | 'seller';
  };
}

export interface UseOrderDetailReturn {
  // Data
  data: TransactionData | null;
  setData: React.Dispatch<React.SetStateAction<TransactionData | null>>;

  // Loading/Error states
  loading: boolean;
  error: string | null;
  authLoading: boolean;

  // User
  user: User | null;
  orderId: string;

  // Message handling
  sendingMessage: boolean;
  handleSendMessage: (content: string, photoUrls?: string[]) => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (smooth?: boolean) => void;

  // Actions
  confirmingReceipt: boolean;
  handleConfirmReceipt: () => Promise<void>;

  // Issue reporting
  showReportIssue: boolean;
  setShowReportIssue: (value: boolean) => void;
  reportingIssue: boolean;
  issueType: string;
  setIssueType: (value: string) => void;
  issueDescription: string;
  setIssueDescription: (value: string) => void;
  handleReportIssue: () => Promise<void>;

  // Action feedback
  actionError: string | null;
  setActionError: (value: string | null) => void;
  actionSuccess: string | null;
  setActionSuccess: (value: string | null) => void;

  // Review
  hasReview: boolean | null;

  // Helpers
  fetchData: () => Promise<void>;
  getTimeRemainingMs: () => number | null;
}

export function useOrderDetail(): UseOrderDetailReturn {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  // Core data state
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Message state
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Action states
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [hasReview, setHasReview] = useState<boolean | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirect=/orders/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  // Fetch order and conversation data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/transactions/${orderId}/conversation`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch order');
      }

      setData(result);

      // Check if buyer has already reviewed this order
      if (result.current_user.role === 'buyer' &&
          (result.order.status === 'delivered' || result.order.status === 'completed')) {
        try {
          const reviewRes = await fetch(`/api/reviews?order_id=${orderId}`);
          if (reviewRes.ok) {
            const reviewData = await reviewRes.json();
            setHasReview(reviewData.reviews?.length > 0);
          }
        } catch {
          // Non-critical — don't block order page
        }
      }

      setTimeout(() => scrollToBottom(false), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId, scrollToBottom]);

  // Initial data fetch
  useEffect(() => {
    if (user && orderId) {
      fetchData();
    }
  }, [user, orderId, fetchData]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!data?.conversation) return;

    const channel = supabase
      .channel(`order:${data.conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${data.conversation.id}`,
        },
        (payload: { new: Message }) => {
          const newMessage = payload.new as Message;

          setData((prev) => {
            if (!prev) return prev;
            const exists = prev.messages.some((m) => m.id === newMessage.id);
            if (exists) return prev;

            // Add sender info
            const messageWithSender = {
              ...newMessage,
              sender:
                newMessage.sender_id === prev.buyer?.id
                  ? prev.buyer
                  : newMessage.sender_id === prev.seller?.id
                    ? prev.seller
                    : null,
            };

            return {
              ...prev,
              messages: [...prev.messages, messageWithSender],
            };
          });

          setTimeout(() => scrollToBottom(true), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.conversation, scrollToBottom]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, photoUrls?: string[]) => {
    if (!user || !data) return;

    setSendingMessage(true);

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: data.conversation.id,
      sender_id: user.id,
      content,
      is_system_message: false,
      photo_urls: photoUrls || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      sender: {
        id: user.id,
        full_name:
          data.current_user.role === 'buyer'
            ? data.buyer?.full_name || null
            : data.seller?.full_name || null,
        avatar_url:
          data.current_user.role === 'buyer'
            ? data.buyer?.avatar_url || null
            : data.seller?.avatar_url || null,
      },
    };

    setData((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev
    );
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const response = await fetch(`/api/messages/${data.conversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, photo_urls: photoUrls }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();

      // Replace optimistic message with real one
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === optimisticMessage.id ? result.message : msg
          ),
        };
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message on error
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter(
            (msg) => msg.id !== optimisticMessage.id
          ),
        };
      });
      throw err;
    } finally {
      setSendingMessage(false);
    }
  }, [user, data, scrollToBottom]);

  // Handle confirm receipt
  const handleConfirmReceipt = useCallback(async () => {
    if (!user || !data) return;

    setConfirmingReceipt(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(
        `/api/transactions/${orderId}/confirm-receipt`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to confirm receipt');
      }

      setActionSuccess(result.message);
      // Update local state
      setData((prev) =>
        prev
          ? { ...prev, order: { ...prev.order, status: 'completed' } }
          : prev
      );
      // Refresh to get system messages
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to confirm receipt'
      );
    } finally {
      setConfirmingReceipt(false);
    }
  }, [user, data, orderId, fetchData]);

  // Handle report issue
  const handleReportIssue = useCallback(async () => {
    if (!user || !data || !issueType || !issueDescription) return;

    setReportingIssue(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(
        `/api/transactions/${orderId}/report-issue`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue_type: issueType,
            description: issueDescription,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to report issue');
      }

      setActionSuccess(result.message);
      setShowReportIssue(false);
      setIssueType('');
      setIssueDescription('');
      // Refresh to get system messages and updated status
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to report issue'
      );
    } finally {
      setReportingIssue(false);
    }
  }, [user, data, orderId, issueType, issueDescription, fetchData]);

  // Calculate time remaining
  const getTimeRemainingMs = useCallback(() => {
    if (!data?.order.timestamps.seller_response_deadline) return null;
    return (
      new Date(data.order.timestamps.seller_response_deadline).getTime() -
      Date.now()
    );
  }, [data?.order.timestamps.seller_response_deadline]);

  return {
    // Data
    data,
    setData,

    // Loading/Error states
    loading,
    error,
    authLoading,

    // User
    user,
    orderId,

    // Message handling
    sendingMessage,
    handleSendMessage,
    messagesEndRef,
    messagesContainerRef,
    scrollToBottom,

    // Actions
    confirmingReceipt,
    handleConfirmReceipt,

    // Issue reporting
    showReportIssue,
    setShowReportIssue,
    reportingIssue,
    issueType,
    setIssueType,
    issueDescription,
    setIssueDescription,
    handleReportIssue,

    // Action feedback
    actionError,
    setActionError,
    actionSuccess,
    setActionSuccess,

    // Review
    hasReview,

    // Helpers
    fetchData,
    getTimeRemainingMs,
  };
}
