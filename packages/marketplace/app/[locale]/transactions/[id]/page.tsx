'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Truck,
  MapPin,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import type { Message } from '@/lib/types/message';

interface OrderItem {
  id: string;
  listing_id: string;
  game_name: string;
  game_bgg_id?: number;
  price: number;
  condition: string;
  photo_url: string | null;
}

interface TrackingEvent {
  id: string;
  event_type: string;
  state_type: string;
  state_text: string;
  location?: string;
  description?: string;
  event_timestamp: string;
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
  shipping_method: 't2t' | 'local_pickup';
  total_amount: number;
  items_total: number;
  shipping_cost: number;
  service_fee: number;
  destination?: {
    country?: string;
    terminal_id?: string;
    terminal_name?: string;
    terminal_address?: string;
    receiver_name?: string;
    receiver_phone?: string;
    city?: string;
    notes?: string;
  };
  tracking?: {
    barcode?: string;
    tracking_url?: string;
    label_url?: string;
  };
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

const statusSteps = [
  { key: 'placed', label: 'Order Placed', statuses: ['pending_payment', 'pending_seller', 'accepted', 'shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'pending', label: 'Waiting for Seller', statuses: ['pending_seller', 'accepted', 'shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'accepted', label: 'Seller Accepted', statuses: ['accepted', 'shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered', 'completed'] },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'trust' }> = {
  pending_payment: { label: 'Pending Payment', variant: 'warning' },
  pending_seller: { label: 'Waiting for Seller', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'trust' },
  shipped: { label: 'Shipped', variant: 'trust' },
  in_transit: { label: 'In Transit', variant: 'trust' },
  delivered: { label: 'Delivered', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  refunded: { label: 'Refunded', variant: 'error' },
  disputed: { label: 'Disputed', variant: 'error' },
};

export default function TransactionPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
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
      router.push(`/auth/signin?redirect=/transactions/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  // Fetch transaction data
  const fetchTransaction = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/transactions/${orderId}/conversation`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch transaction');
      }

      setData(result);
      setTimeout(() => scrollToBottom(false), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && orderId) {
      fetchTransaction();
    }
  }, [user, orderId]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!data?.conversation) return;

    const channel = supabase
      .channel(`transaction:${data.conversation.id}`)
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
              sender: newMessage.sender_id === prev.buyer?.id
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
        full_name: data.current_user.role === 'buyer' ? data.buyer?.full_name || null : data.seller?.full_name || null,
        avatar_url: data.current_user.role === 'buyer' ? data.buyer?.avatar_url || null : data.seller?.avatar_url || null,
      },
    };

    setData((prev) => prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev);
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
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((msg) => msg.id !== optimisticMessage.id),
        };
      });
      throw error;
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
      const response = await fetch(`/api/transactions/${orderId}/confirm-receipt`, {
        method: 'POST',
      });

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
      setTimeout(() => fetchTransaction(), 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm receipt');
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
      const response = await fetch(`/api/transactions/${orderId}/report-issue`, {
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

      setActionSuccess(result.message);
      setShowReportIssue(false);
      setIssueType('');
      setIssueDescription('');
      // Refresh to get system messages and updated status
      setTimeout(() => fetchTransaction(), 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to report issue');
    } finally {
      setReportingIssue(false);
    }
  };

  // Get step status for timeline
  const getStepStatus = (step: typeof statusSteps[0]) => {
    if (!data) return 'pending';
    if (data.order.status === 'cancelled' || data.order.status === 'refunded') return 'pending';
    if (step.statuses.includes(data.order.status)) return 'completed';
    return 'pending';
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading transaction...</p>
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
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || 'Transaction not found'}
          </h2>
          <Link href="/orders">
            <Button variant="primary">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const { order, order_items, tracking_events, buyer, seller, current_user, messages, conversation } = data;
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const otherUser = current_user.role === 'buyer' ? seller : buyer;
  const statusInfo = statusConfig[order.status] || { label: order.status, variant: 'default' as const };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Fixed Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href={current_user.role === 'buyer' ? '/orders' : '/seller/orders'}
            className="inline-flex items-center gap-2 text-text-secondary hover:text-frost-ice mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-polar-night">
                  {order.order_number}
                </h1>
                <Badge variant={statusInfo.variant} size="sm">
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {current_user.role === 'buyer' ? 'Seller' : 'Buyer'}:{' '}
                <span className="font-medium text-text-primary">
                  {otherUser?.full_name || 'Unknown'}
                </span>
              </p>
            </div>

            {/* Toggle details button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex-shrink-0"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Order Details */}
      {showDetails && (
        <div className="bg-background-secondary border-b border-divider-subtle">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Status Timeline */}
            {!isCancelled && (
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-4">Order Progress</h3>
                <div className="flex items-center justify-between">
                  {statusSteps.map((step, index) => {
                    const status = getStepStatus(step);
                    const isActive = status === 'completed';

                    return (
                      <div key={step.key} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              isActive
                                ? 'bg-frost-ice text-snow-white'
                                : 'bg-bg-secondary text-text-muted'
                            }`}
                          >
                            {isActive ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>
                          <span className={`text-xs mt-1 text-center max-w-[60px] ${isActive ? 'text-frost-ice' : 'text-text-muted'}`}>
                            {step.label}
                          </span>
                        </div>
                        {index < statusSteps.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-2 ${isActive ? 'bg-frost-ice' : 'bg-border-subtle'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="bg-aurora-red/10 border border-aurora-red/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-aurora-red">
                      Order {order.status === 'refunded' ? 'Refunded' : 'Cancelled'}
                    </h3>
                    {order.timestamps.cancelled_at && (
                      <p className="text-sm text-text-secondary mt-1">
                        {new Date(order.timestamps.cancelled_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Order Items */}
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  Items ({order_items.length})
                </h3>
                <div className="space-y-3">
                  {order_items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-12 rounded bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.game_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-polar-night truncate">{item.game_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={item.condition as any} size="sm">
                            {getConditionLabel(item.condition as ListingCondition)}
                          </Badge>
                          <span className="text-sm font-semibold text-polar-night">€{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order totals */}
                <div className="border-t border-border-subtle mt-4 pt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Items</span>
                    <span>€{order.items_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Shipping</span>
                    <span>{order.shipping_cost === 0 ? 'Free' : `€${order.shipping_cost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Service Fee</span>
                    <span>€{order.service_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-polar-night pt-1">
                    <span>Total</span>
                    <span>€{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping/Tracking Info */}
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  {order.shipping_method === 't2t' ? 'Delivery' : 'Pickup'}
                </h3>

                {order.shipping_method === 't2t' ? (
                  <div className="space-y-3">
                    {order.destination?.terminal_name && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-polar-night">
                            {order.destination.terminal_name}
                          </p>
                          {order.destination.terminal_address && (
                            <p className="text-xs text-text-secondary">{order.destination.terminal_address}</p>
                          )}
                          {order.destination.country && (
                            <p className="text-xs text-text-muted mt-1">
                              {getCountryFlag(order.destination.country)} {getCountryName(order.destination.country)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {order.tracking?.barcode && (
                      <div className="p-3 bg-frost-ice/10 border border-frost-ice/20 rounded-lg">
                        <p className="text-xs text-text-secondary mb-1">Tracking Number</p>
                        <p className="font-mono text-sm font-bold text-frost-ice">{order.tracking.barcode}</p>
                        {order.tracking.tracking_url && (
                          <a
                            href={order.tracking.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-frost-ice hover:underline mt-2"
                          >
                            Track Package
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Tracking Events */}
                    {tracking_events.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-medium text-text-secondary mb-2">Tracking History</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {tracking_events.slice().reverse().map((event) => (
                            <div key={event.id} className="flex gap-2 text-xs">
                              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                event.state_type === 'PARCEL_DELIVERED' ? 'bg-aurora-green' : 'bg-frost-ice'
                              }`} />
                              <div>
                                <p className="text-text-primary">{event.state_text}</p>
                                <p className="text-text-muted">
                                  {new Date(event.event_timestamp).toLocaleDateString()}{' '}
                                  {new Date(event.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-polar-night">
                        Pickup in {order.destination?.city || 'TBD'}
                      </p>
                      {order.destination?.notes && (
                        <p className="text-xs text-text-secondary mt-1">{order.destination.notes}</p>
                      )}
                      <p className="text-xs text-text-muted mt-2">
                        Coordinate pickup details via messages below
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar - Shows for delivered orders or active orders */}
      {!isCancelled && (order.status === 'delivered' || ['accepted', 'shipped', 'in_transit'].includes(order.status)) && (
        <div className="border-b border-divider-subtle bg-frost-ice/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
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
              {current_user.role === 'buyer' && order.status === 'delivered' && (
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

              {/* Report Issue - For both parties on active orders */}
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
              <div className="mt-3 p-4 bg-snow-white border border-border rounded-lg">
                <h4 className="text-sm font-semibold text-polar-night mb-3">Report an Issue</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Issue Type
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
                    >
                      <option value="">Select an issue type...</option>
                      <option value="not_received">Package not received</option>
                      <option value="damaged">Item arrived damaged</option>
                      <option value="wrong_item">Wrong item received</option>
                      <option value="not_as_described">Item not as described</option>
                      <option value="shipping_delay">Shipping delay</option>
                      {current_user.role === 'buyer' && (
                        <option value="seller_unresponsive">Seller unresponsive</option>
                      )}
                      {current_user.role === 'seller' && (
                        <option value="buyer_unresponsive">Buyer unresponsive</option>
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
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice/50 resize-none"
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
                      disabled={reportingIssue || !issueType || issueDescription.length < 10}
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
        </div>
      )}

      {/* Messages Section */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages header */}
        <div className="px-4 sm:px-6 py-3 border-b border-divider-subtle bg-background-secondary">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-frost-ice" />
            <h2 className="text-sm font-semibold text-polar-night">Messages</h2>
            <span className="text-xs text-text-tertiary">
              ({messages.length})
            </span>
          </div>
        </div>

        {/* Messages list */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
          style={{ minHeight: '300px', maxHeight: 'calc(100vh - 400px)' }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className="w-12 h-12 text-text-muted mb-3" />
              <p className="text-text-secondary">No messages yet</p>
              <p className="text-sm text-text-tertiary mt-1">
                Start the conversation with {otherUser?.full_name || 'the other party'}
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
        <div className="border-t border-divider-subtle bg-background-primary px-4 sm:px-6 py-3">
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
  );
}
