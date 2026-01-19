'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import {
  Package,
  Time as Clock,
  CheckCircleAlt01 as CheckCircle2,
  CloseCircle as XCircle,
  RefreshCw as Loader2,
  AlertCircle,
  ArrowLeft,
  Chat as MessageSquare,
  AlertTriangle,
  Check,
} from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import { UserInfoCard } from '@/components/user';
import type { Message } from '@/lib/types/message';
import {
  StatusTimeline,
  ShippingInfoCard,
  TrackingNumberCard,
  TrackingEventsTimeline,
  getStatusConfig,
  isCancelledStatus,
  type TrackingEvent,
  type ShippingDestination,
  type TrackingData,
} from '@/components/shipping';

interface OrderItem {
  id: string;
  listing_id: string;
  game_name: string;
  game_bgg_id?: number;
  price: number;
  condition: string;
  photo_url: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ConversationData {
  id: string;
  order_id: string | null;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  shipping_method: 't2t';
  total_amount: number;
  items_total: number;
  shipping_cost: number;
  service_fee: number;
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
  };
}

interface TransactionData {
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

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations('Orders.detail');

  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirect=/orders/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  // Fetch order and conversation data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/transactions/${orderId}/conversation`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch order');
      }

      setData(result);
      setTimeout(() => scrollToBottom(false), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && orderId) {
      fetchData();
    }
  }, [user, orderId]);

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
  }, [data?.conversation]);

  // Handle sending messages
  const handleSendMessage = async (content: string, photoUrls?: string[]) => {
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
  };

  // Handle confirm receipt
  const handleConfirmReceipt = async () => {
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
  };

  // Handle report issue
  const handleReportIssue = async () => {
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
  };

  // Calculate time remaining
  const getTimeRemainingMs = () => {
    if (!data?.order.timestamps.seller_response_deadline) return null;
    return (
      new Date(data.order.timestamps.seller_response_deadline).getTime() -
      Date.now()
    );
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night dark:text-snow-white mb-2">
            {error || t('notFound')}
          </h2>
          <Link href="/orders">
            <Button variant="primary">{t('backToOrders')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  const {
    order,
    order_items,
    tracking_events,
    buyer,
    seller,
    current_user,
    messages,
    conversation,
  } = data;
  const isCancelled = isCancelledStatus(order.status);
  const otherUser = current_user.role === 'buyer' ? seller : buyer;
  const statusInfo = getStatusConfig(order.status);
  const StatusIcon = statusInfo.icon;
  const timeRemainingMs = getTimeRemainingMs();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-frost-ice mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToOrders')}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-polar-night dark:text-snow-white">
                  {t('orderTitle', { orderNumber: order.order_number })}
                </h1>
                <Badge variant={statusInfo.variant as any} size="lg">
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-text-secondary">
                {t('placedAt', {
                  date: new Date(order.timestamps.created_at).toLocaleDateString(),
                  time: new Date(order.timestamps.created_at).toLocaleTimeString(),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            {!isCancelled && (
              <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-4 sm:p-6">
                <StatusTimeline
                  currentStatus={order.status}
                  timeRemainingMs={timeRemainingMs}
                  title={t('orderStatus')}
                />
              </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="bg-aurora-red/10 border-2 border-aurora-red/20 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-aurora-red flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-aurora-red mb-2">
                      {t('cancelled.title')}
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                      {t('cancelled.defaultReason')}
                    </p>
                    {order.timestamps.refunded_at && (
                      <div className="p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg">
                        <p className="text-sm font-medium text-polar-night dark:text-snow-white">
                          {t('cancelled.refundProcessed', {
                            amount: order.total_amount.toFixed(2),
                          })}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {t('cancelled.refundedOn', {
                            date: new Date(
                              order.timestamps.refunded_at
                            ).toLocaleDateString(),
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pending Seller Warning */}
            {order.status === 'pending_seller' && timeRemainingMs !== null && (
              <div
                className={`border-2 rounded-xl p-4 sm:p-6 ${
                  timeRemainingMs <= 0
                    ? 'bg-aurora-red/10 border-aurora-red/20'
                    : 'bg-aurora-yellow/10 border-aurora-yellow/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Clock
                    className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                      timeRemainingMs <= 0
                        ? 'text-aurora-red'
                        : 'text-aurora-yellow'
                    }`}
                  />
                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        timeRemainingMs <= 0
                          ? 'text-aurora-red'
                          : 'text-polar-night dark:text-snow-white'
                      }`}
                    >
                      {timeRemainingMs <= 0
                        ? t('pending.expiredTitle')
                        : t('pending.waitingTitle')}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {timeRemainingMs <= 0
                        ? t('pending.expiredDescription')
                        : t('pending.waitingDescription', {
                            hours: Math.floor(timeRemainingMs / 3600000),
                            minutes: Math.floor(
                              (timeRemainingMs % 3600000) / 60000
                            ),
                          })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-4">
                {t('items.title', { count: order_items.length })}
              </h2>
              <div className="space-y-4">
                {order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.game_name}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-text-muted" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <Link
                        href={`/game/${item.game_bgg_id}`}
                        className="font-medium text-polar-night dark:text-snow-white hover:text-frost-ice transition-colors line-clamp-2"
                      >
                        {item.game_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={item.condition as any} size="sm">
                          {getConditionLabel(item.condition as ListingCondition)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-polar-night dark:text-snow-white">
                        €{item.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-4 sm:p-6">
              <ShippingInfoCard
                destination={order.destination}
                title={t('shipping.deliveryTitle')}
              />

              {/* Tracking Number */}
              {order.tracking.barcode && (
                <div className="mt-4">
                  <TrackingNumberCard
                    tracking={order.tracking}
                    title={t('shipping.trackingNumber')}
                  />
                </div>
              )}

              {/* Tracking Events */}
              {tracking_events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <TrackingEventsTimeline
                    events={tracking_events}
                    title={t('tracking.title')}
                  />
                </div>
              )}
            </div>

            {/* Action Bar */}
            {!isCancelled &&
              (order.status === 'delivered' ||
                ['accepted', 'shipped', 'in_transit'].includes(
                  order.status
                )) && (
                <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-xl p-4">
                  {/* Action Feedback */}
                  {actionError && (
                    <div className="mb-3 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-aurora-red">{actionError}</p>
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="mb-3 p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-aurora-green">{actionSuccess}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Confirm Receipt - Only for buyer when delivered */}
                    {current_user.role === 'buyer' &&
                      order.status === 'delivered' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleConfirmReceipt}
                          disabled={confirmingReceipt}
                        >
                          {confirmingReceipt ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Confirm Receipt
                            </>
                          )}
                        </Button>
                      )}

                    {/* Report Issue */}
                    {!showReportIssue && order.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReportIssue(true)}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Report Issue
                      </Button>
                    )}
                  </div>

                  {/* Report Issue Form */}
                  {showReportIssue && (
                    <div className="mt-3 p-4 bg-snow-white dark:bg-polar-night-light border border-border rounded-lg">
                      <h4 className="text-sm font-semibold text-polar-night dark:text-snow-white mb-3">
                        Report an Issue
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Issue Type
                          </label>
                          <select
                            value={issueType}
                            onChange={(e) => setIssueType(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-snow-white dark:bg-polar-night text-polar-night dark:text-snow-white focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
                          >
                            <option value="">Select an issue type...</option>
                            <option value="not_received">
                              Package not received
                            </option>
                            <option value="damaged">Item arrived damaged</option>
                            <option value="wrong_item">
                              Wrong item received
                            </option>
                            <option value="not_as_described">
                              Item not as described
                            </option>
                            <option value="shipping_delay">Shipping delay</option>
                            {current_user.role === 'buyer' && (
                              <option value="seller_unresponsive">
                                Seller unresponsive
                              </option>
                            )}
                            {current_user.role === 'seller' && (
                              <option value="buyer_unresponsive">
                                Buyer unresponsive
                              </option>
                            )}
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Description (minimum 10 characters)
                          </label>
                          <textarea
                            value={issueDescription}
                            onChange={(e) => setIssueDescription(e.target.value)}
                            placeholder="Describe the issue in detail..."
                            rows={3}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-snow-white dark:bg-polar-night text-polar-night dark:text-snow-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice/50 resize-none"
                          />
                          <p className="text-xs text-text-muted mt-1">
                            {issueDescription.length}/2000 characters
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleReportIssue}
                            disabled={
                              reportingIssue ||
                              !issueType ||
                              issueDescription.length < 10
                            }
                          >
                            {reportingIssue ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              'Submit Issue'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowReportIssue(false);
                              setIssueType('');
                              setIssueDescription('');
                              setActionError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Messages Section */}
            <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl overflow-hidden">
              {/* Messages header */}
              <div className="px-4 py-3 border-b border-border-subtle bg-bg-secondary dark:bg-polar-night">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-frost-ice" />
                  <h2 className="text-sm font-semibold text-polar-night dark:text-snow-white">
                    Messages
                  </h2>
                  <span className="text-xs text-text-tertiary">
                    ({messages.length})
                  </span>
                </div>
              </div>

              {/* Messages list */}
              <div
                ref={messagesContainerRef}
                className="px-4 py-4 overflow-y-auto"
                style={{ minHeight: '200px', maxHeight: '400px' }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <MessageSquare className="w-12 h-12 text-text-muted mb-3" />
                    <p className="text-text-secondary">No messages yet</p>
                    <p className="text-sm text-text-tertiary mt-1">
                      Start the conversation with{' '}
                      {otherUser?.full_name || 'the other party'}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === user.id}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="border-t border-border-subtle bg-bg-primary dark:bg-polar-night px-4 py-3">
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={sendingMessage}
                  placeholder={`Message ${otherUser?.full_name || 'the other party'}...`}
                  conversationId={conversation.id}
                  allowPhotos={true}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold text-polar-night dark:text-snow-white mb-4">
                {t('summary.title')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('summary.items')}</span>
                  <span className="font-medium text-polar-night dark:text-snow-white">
                    €{order.items_total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    {t('summary.shipping')}
                  </span>
                  <span className="font-medium">
                    {order.shipping_cost === 0 ? (
                      <span className="text-aurora-green">{t('summary.free')}</span>
                    ) : (
                      <span className="text-polar-night dark:text-snow-white">€{order.shipping_cost.toFixed(2)}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    {t('summary.serviceFee')}
                  </span>
                  <span className="font-medium text-polar-night dark:text-snow-white">
                    €{order.service_fee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border-subtle">
                  <span className="font-semibold text-polar-night dark:text-snow-white">
                    {t('summary.totalPaid')}
                  </span>
                  <span className="text-lg font-bold text-polar-night dark:text-snow-white">
                    €{order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Other Party Information */}
            {otherUser && (
              <div className="bg-snow-white dark:bg-polar-night-light border border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-polar-night dark:text-snow-white mb-4">
                  {current_user.role === 'buyer'
                    ? t('seller.title')
                    : 'Buyer'}
                </h3>
                <UserInfoCard
                  user={{
                    id: otherUser.id,
                    name: otherUser.full_name || 'Unknown',
                    avatarUrl: otherUser.avatar_url,
                    country: null,
                  }}
                  size="md"
                  countryDisplay="full"
                />
              </div>
            )}

            {/* Help */}
            <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-polar-night dark:text-snow-white mb-1">
                    {t('help.title')}
                  </p>
                  <p className="text-text-secondary">{t('help.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
