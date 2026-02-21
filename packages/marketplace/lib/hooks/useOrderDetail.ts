'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useOrderMessages } from './useOrderMessages';
import type { User } from '@supabase/supabase-js';
import type { Message } from '@/lib/types/message';
import type { TrackingEvent, ShippingDestination, TrackingData } from '@/components/shipping';

// Types
export interface OrderItem {
  id: string;
  listing_id: string;
  game_name: string;
  bgg_game_id?: number;
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
  messages: Message[];
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
  const t = useTranslations('Orders.detail.actions');

  // Core data state
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Messaging (delegated to useOrderMessages)
  const messaging = useOrderMessages({
    conversationId: data?.conversation.id ?? null,
    currentUserId: user?.id ?? null,
    buyerProfile: data?.buyer ?? null,
    sellerProfile: data?.seller ?? null,
  });

  // Action states
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [hasReview, setHasReview] = useState<boolean | null>(null);

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
      messaging.setMessages(result.messages);

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

      setTimeout(() => messaging.scrollToBottom(false), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- messaging.setMessages and messaging.scrollToBottom are stable refs
  }, [orderId]);

  // Initial data fetch
  useEffect(() => {
    if (user && orderId) {
      fetchData();
    }
  }, [user, orderId, fetchData]);

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

      setActionSuccess(t('confirmReceiptSuccess'));
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
        err instanceof Error ? err.message : t('confirmReceiptError')
      );
    } finally {
      setConfirmingReceipt(false);
    }
  }, [user, data, orderId, fetchData, t]);

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

      setActionSuccess(t('reportIssueSuccess'));
      setShowReportIssue(false);
      setIssueType('');
      setIssueDescription('');
      // Refresh to get system messages and updated status
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t('reportIssueError')
      );
    } finally {
      setReportingIssue(false);
    }
  }, [user, data, orderId, issueType, issueDescription, fetchData, t]);

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
    messages: messaging.messages,
    sendingMessage: messaging.sendingMessage,
    handleSendMessage: messaging.handleSendMessage,
    messagesEndRef: messaging.messagesEndRef,
    messagesContainerRef: messaging.messagesContainerRef,
    scrollToBottom: messaging.scrollToBottom,

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
