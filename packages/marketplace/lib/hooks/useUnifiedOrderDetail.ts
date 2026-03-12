'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useActiveOrders } from '@/lib/contexts/ActiveOrdersContext';
import { useOrderMessages } from './useOrderMessages';
import type { User } from '@supabase/supabase-js';
import type { Message } from '@/lib/types/message';
import type { TrackingEvent, ShippingDestination, TrackingData } from '@/components/shipping';
import type { OrderPayment } from '@/lib/types/order-detail';

// --- Data types ---

export interface OrderItem {
  id: string;
  listing_id?: string;
  game_name: string;
  bgg_game_id?: number;
  price: number;
  condition: string;
  photo_url: string | null;
  game_thumbnail?: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  country?: string | null;
}

export interface ConversationData {
  id: string;
  order_id: string | null;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

export interface OrderDispute {
  reason: string;
  description: string;
  status: string;
  seller_response?: string;
  seller_responded_at?: string;
  seller_deadline?: string;
  photo_urls?: string[];
  resolved_at?: string;
  resolution?: string;
  resolution_note?: string;
}

export interface ReviewData {
  id: string;
  rating: number;
  review_text: string | null;
}

export interface OrderData {
  id: string;
  order_number: string;
  status: string;
  shipping_method: string;
  total_amount: number;
  items_total: number;
  shipping_cost: number;
  refund_amount?: number | null;
  refund_status?: string | null;
  payment_method?: string | null;
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
  dispute?: OrderDispute | null;
  invoice_number?: string | null;
  credit_note_number?: string | null;
  // Seller-specific (only present when viewer is seller)
  parcel_size?: string;
  label_error?: string;
  payment?: OrderPayment;
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

// --- Hook return type ---

export interface UseUnifiedOrderDetailReturn {
  // Data
  data: TransactionData | null;
  viewerRole: 'buyer' | 'seller' | null;
  loading: boolean;
  error: string | null;
  authLoading: boolean;
  user: User | null;
  orderId: string;

  // Messages
  messages: Message[];
  sendingMessage: boolean;
  handleSendMessage: (content: string, photoUrls?: string[]) => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;

  // Buyer actions
  confirmingReceipt: boolean;
  handleConfirmReceipt: () => Promise<void>;
  showReportIssue: boolean;
  setShowReportIssue: (value: boolean) => void;
  reportingIssue: boolean;
  issueType: string;
  setIssueType: (value: string) => void;
  issueDescription: string;
  setIssueDescription: (value: string) => void;
  handleReportIssue: () => Promise<void>;
  existingReview: ReviewData | null | undefined;
  setExistingReview: (review: ReviewData | null | undefined) => void;

  // Seller actions
  showAcceptModal: boolean;
  setShowAcceptModal: (show: boolean) => void;
  showDeclineModal: boolean;
  setShowDeclineModal: (show: boolean) => void;
  declineReason: string;
  setDeclineReason: (reason: string) => void;
  actionLoading: boolean;
  handleAcceptOrder: () => Promise<void>;
  handleDeclineOrder: () => Promise<void>;
  retryingLabel: boolean;
  retryError: string | null;
  handleRetryLabel: () => Promise<void>;

  // Shared
  actionError: string | null;
  setActionError: (value: string | null) => void;
  actionSuccess: string | null;
  getTimeRemainingMs: () => number | null;
  timeRemaining: string | null;
  fetchData: () => Promise<void>;
}

export function useUnifiedOrderDetail(): UseUnifiedOrderDetailReturn {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const tActions = useTranslations('Orders.detail.actions');

  // --- Core data state ---
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Messaging ---
  const messaging = useOrderMessages({
    conversationId: data?.conversation.id ?? null,
    currentUserId: user?.id ?? null,
    buyerProfile: data?.buyer ?? null,
    sellerProfile: data?.seller ?? null,
  });

  // --- Shared action state ---
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // --- Buyer action state ---
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [existingReview, setExistingReview] = useState<ReviewData | null | undefined>(undefined);

  // --- Seller action state ---
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [retryingLabel, setRetryingLabel] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // --- Timer state ---
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // --- Active orders badge refresh ---
  const { refresh: refreshActiveOrders } = useActiveOrders();

  // Derived
  const viewerRole = data?.current_user.role ?? null;

  // --- Auth redirect ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirectTo=/orders/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  // --- Data fetching ---
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

      // Fetch review for both buyer and seller when order is delivered or completed
      if (result.order.status === 'delivered' || result.order.status === 'completed') {
        try {
          const reviewRes = await fetch(`/api/reviews?order_id=${result.order.id}`);
          if (reviewRes.ok) {
            const reviewData = await reviewRes.json();
            const review = reviewData.reviews?.[0] ?? null;
            setExistingReview(review ? { id: review.id, rating: review.rating, review_text: review.review_text ?? null } : null);
          }
        } catch {
          // Non-critical — leave as undefined
        }
      } else {
        setExistingReview(null);
      }

      setTimeout(() => messaging.scrollToBottom(false), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messaging refs are stable
  }, [orderId]);

  // Initial data fetch
  useEffect(() => {
    if (user && orderId) {
      fetchData();
    }
  }, [user, orderId, fetchData]);

  // --- Countdown timer for seller response deadline ---
  useEffect(() => {
    if (!data?.order.timestamps.seller_response_deadline || data.order.status !== 'pending_seller') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(data.order.timestamps.seller_response_deadline!).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [data?.order.timestamps.seller_response_deadline, data?.order.status]);

  // --- Buyer: Confirm receipt ---
  const handleConfirmReceipt = useCallback(async () => {
    if (!user || !data) return;

    setConfirmingReceipt(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/transactions/${data.order.id}/confirm-receipt`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to confirm receipt');
      }

      setActionSuccess(tActions('confirmReceiptSuccess'));
      setData((prev) =>
        prev ? { ...prev, order: { ...prev.order, status: 'completed' } } : prev
      );
      refreshActiveOrders();
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : tActions('confirmReceiptError'));
    } finally {
      setConfirmingReceipt(false);
    }
  }, [user, data, fetchData, tActions, refreshActiveOrders]);

  // --- Buyer: Report issue ---
  const handleReportIssue = useCallback(async () => {
    if (!user || !data || !issueType || !issueDescription) return;

    setReportingIssue(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/transactions/${data.order.id}/report-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_type: issueType,
          description: issueDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to report issue');
      }

      setActionSuccess(tActions('reportIssueSuccess'));
      setShowReportIssue(false);
      setIssueType('');
      setIssueDescription('');
      refreshActiveOrders();
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : tActions('reportIssueError'));
    } finally {
      setReportingIssue(false);
    }
  }, [user, data, issueType, issueDescription, fetchData, tActions, refreshActiveOrders]);

  // --- Seller: Accept order ---
  const handleAcceptOrder = useCallback(async () => {
    try {
      setActionLoading(true);
      setActionError(null);

      const response = await fetch(`/api/seller/orders/${data?.order.id ?? orderId}/accept`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept order');
      }

      await fetchData();
      setShowAcceptModal(false);
      refreshActiveOrders();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  }, [data?.order.id, orderId, fetchData, refreshActiveOrders]);

  // --- Seller: Decline order ---
  const handleDeclineOrder = useCallback(async () => {
    try {
      setActionLoading(true);
      setActionError(null);

      const response = await fetch(`/api/seller/orders/${data?.order.id ?? orderId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: declineReason || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline order');
      }

      refreshActiveOrders();
      router.push('/orders');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to decline order');
      setActionLoading(false);
    }
  }, [data?.order.id, orderId, declineReason, router, refreshActiveOrders]);

  // --- Seller: Retry label generation ---
  const handleRetryLabel = useCallback(async () => {
    try {
      setRetryingLabel(true);
      setRetryError(null);

      const response = await fetch(`/api/seller/orders/${data?.order.id ?? orderId}/retry-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to generate label');
      }

      await fetchData();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Failed to generate label');
    } finally {
      setRetryingLabel(false);
    }
  }, [data?.order.id, orderId, fetchData]);

  // --- Helpers ---
  const getTimeRemainingMs = useCallback(() => {
    if (!data?.order.timestamps.seller_response_deadline) return null;
    return (
      new Date(data.order.timestamps.seller_response_deadline).getTime() - Date.now()
    );
  }, [data?.order.timestamps.seller_response_deadline]);

  return {
    // Data
    data,
    viewerRole,
    loading,
    error,
    authLoading,
    user,
    orderId,

    // Messages
    messages: messaging.messages,
    sendingMessage: messaging.sendingMessage,
    handleSendMessage: messaging.handleSendMessage,
    messagesEndRef: messaging.messagesEndRef,
    messagesContainerRef: messaging.messagesContainerRef,

    // Buyer actions
    confirmingReceipt,
    handleConfirmReceipt,
    showReportIssue,
    setShowReportIssue,
    reportingIssue,
    issueType,
    setIssueType,
    issueDescription,
    setIssueDescription,
    handleReportIssue,
    existingReview,
    setExistingReview,

    // Seller actions
    showAcceptModal,
    setShowAcceptModal,
    showDeclineModal,
    setShowDeclineModal,
    declineReason,
    setDeclineReason,
    actionLoading,
    handleAcceptOrder,
    handleDeclineOrder,
    retryingLabel,
    retryError,
    handleRetryLabel,

    // Shared
    actionError,
    setActionError,
    actionSuccess,
    getTimeRemainingMs,
    timeRemaining,
    fetchData,
  };
}
