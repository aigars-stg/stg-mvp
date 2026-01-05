'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  Loader2,
  AlertCircle,
  Shield,
  ArrowLeft,
  User,
  Package,
  MapPin,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { MessageBubble } from '@/components/messaging/MessageBubble';
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

interface Issue {
  id: string;
  issue_type: string;
  description: string;
  photo_urls: string[];
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter_id: string;
  reporter_role: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
  phone?: string;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  shipping_method: string;
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
    receiver_email?: string;
    city?: string;
    notes?: string;
  };
  tracking?: {
    barcode?: string;
    tracking_url?: string;
    label_url?: string;
  };
  stripe?: {
    payment_intent_id?: string;
    transfer_id?: string;
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

interface StaffTransactionData {
  conversation: {
    id: string;
    order_id: string | null;
    listing_id: string | null;
    buyer_id: string;
    seller_id: string;
    created_at: string;
  };
  messages: Message[];
  order: OrderData;
  order_items: OrderItem[];
  tracking_events: TrackingEvent[];
  issues: Issue[];
  buyer: UserProfile | null;
  seller: UserProfile | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'trust' }> = {
  pending_payment: { label: 'Pending Payment', variant: 'warning' },
  pending_seller: { label: 'Pending Seller', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'trust' },
  shipped: { label: 'Shipped', variant: 'trust' },
  in_transit: { label: 'In Transit', variant: 'trust' },
  delivered: { label: 'Delivered', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  refunded: { label: 'Refunded', variant: 'error' },
  disputed: { label: 'Disputed', variant: 'error' },
};

const issueTypeLabels: Record<string, string> = {
  not_received: 'Package Not Received',
  damaged: 'Item Damaged',
  wrong_item: 'Wrong Item',
  not_as_described: 'Not As Described',
  shipping_delay: 'Shipping Delay',
  seller_unresponsive: 'Seller Unresponsive',
  buyer_unresponsive: 'Buyer Unresponsive',
  payment_issue: 'Payment Issue',
  other: 'Other',
};

const issueStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  open: { label: 'Open', variant: 'error' },
  investigating: { label: 'Investigating', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};

export default function StaffTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<StaffTransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirect=/staff/transactions/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  // Fetch transaction
  const fetchTransaction = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/staff/transactions/${orderId}`);
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch transaction');
      }

      setIsStaff(true);
      setData(result);
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

  // Not staff check
  if (isStaff === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-aurora-red mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-polar-night mb-2">Staff Access Required</h1>
          <p className="text-text-secondary mb-6">
            This page is only accessible to staff members.
          </p>
          <Link href="/">
            <Button variant="primary">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading transaction...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">{error || 'Transaction not found'}</h2>
          <Link href="/staff/transactions">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const { order, order_items, tracking_events, issues, buyer, seller, messages } = data;
  const statusInfo = statusConfig[order.status] || { label: order.status, variant: 'default' as const };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/staff/transactions"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-frost-ice mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Staff Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Shield className="w-5 h-5 text-frost-ice" />
                <h1 className="text-xl font-bold text-polar-night">
                  {order.order_number}
                </h1>
                <Badge variant={statusInfo.variant} size="sm">
                  {statusInfo.label}
                </Badge>
                {issues.some((i) => i.status === 'open') && (
                  <Badge variant="error" size="sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Open Issues
                  </Badge>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Staff view • Created {new Date(order.timestamps.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Order details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Buyer & Seller */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4">Participants</h3>

              {/* Buyer */}
              <div className="mb-4 pb-4 border-b border-divider-subtle">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />
                  BUYER
                </div>
                <p className="font-medium text-polar-night">{buyer?.full_name || 'Unknown'}</p>
                {buyer?.email && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Mail className="w-3 h-3" />
                    {buyer.email}
                  </div>
                )}
                {buyer?.phone && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Phone className="w-3 h-3" />
                    {buyer.phone}
                  </div>
                )}
              </div>

              {/* Seller */}
              <div>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />
                  SELLER
                </div>
                <p className="font-medium text-polar-night">{seller?.full_name || 'Unknown'}</p>
                {seller?.email && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Mail className="w-3 h-3" />
                    {seller.email}
                  </div>
                )}
                {seller?.phone && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Phone className="w-3 h-3" />
                    {seller.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-3">Items</h3>
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

              {/* Totals */}
              <div className="border-t border-divider-subtle mt-4 pt-4 space-y-1 text-sm">
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

            {/* Shipping/Tracking */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-3">
                {order.shipping_method === 't2t' ? 'Shipping' : 'Pickup'}
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
                      </div>
                    </div>
                  )}

                  {order.tracking?.barcode && (
                    <div className="p-3 bg-frost-ice/10 border border-frost-ice/20 rounded-lg">
                      <p className="text-xs text-text-secondary mb-1">Tracking</p>
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
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {tracking_events.slice().reverse().map((event) => (
                          <div key={event.id} className="flex gap-2 text-xs">
                            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                              event.state_type === 'PARCEL_DELIVERED' ? 'bg-aurora-green' : 'bg-frost-ice'
                            }`} />
                            <div>
                              <p className="text-text-primary">{event.state_text}</p>
                              <p className="text-text-muted">
                                {new Date(event.event_timestamp).toLocaleString()}
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
                  </div>
                </div>
              )}
            </div>

            {/* Stripe Info */}
            {order.stripe && (order.stripe.payment_intent_id || order.stripe.transfer_id) && (
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3">Payment Info</h3>
                <div className="space-y-2 text-xs">
                  {order.stripe.payment_intent_id && (
                    <div>
                      <span className="text-text-muted">Payment Intent:</span>
                      <p className="font-mono text-polar-night truncate">{order.stripe.payment_intent_id}</p>
                    </div>
                  )}
                  {order.stripe.transfer_id && (
                    <div>
                      <span className="text-text-muted">Transfer ID:</span>
                      <p className="font-mono text-polar-night truncate">{order.stripe.transfer_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Issues and Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issues */}
            {issues.length > 0 && (
              <div className="bg-snow-white border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-aurora-red" />
                  Issues ({issues.length})
                </h3>

                <div className="space-y-4">
                  {issues.map((issue) => {
                    const issueStatusInfo = issueStatusConfig[issue.status] || { label: issue.status, variant: 'default' as const };

                    return (
                      <div
                        key={issue.id}
                        className={`p-4 rounded-lg border ${
                          issue.status === 'open' || issue.status === 'investigating'
                            ? 'border-aurora-red/30 bg-aurora-red/5'
                            : 'border-border-subtle bg-background-secondary'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-polar-night">
                                {issueTypeLabels[issue.issue_type] || issue.issue_type}
                              </span>
                              <Badge variant={issueStatusInfo.variant} size="sm">
                                {issueStatusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-text-muted mt-1">
                              Reported by {issue.reporter_role} •{' '}
                              {new Date(issue.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-text-secondary mt-2">{issue.description}</p>

                        {issue.photo_urls && issue.photo_urls.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {issue.photo_urls.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-16 rounded overflow-hidden border border-border"
                              >
                                <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}

                        {issue.resolution_notes && (
                          <div className="mt-3 pt-3 border-t border-divider-subtle">
                            <p className="text-xs text-text-muted">Resolution Notes:</p>
                            <p className="text-sm text-text-secondary">{issue.resolution_notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-divider-subtle bg-background-secondary">
                <h3 className="text-sm font-semibold text-polar-night flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-frost-ice" />
                  Conversation ({messages.length} messages)
                </h3>
              </div>

              <div className="p-4 max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary">No messages in this conversation</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="mb-2">
                      {/* Show who sent the message for staff context */}
                      {!message.is_system_message && (
                        <div className={`text-xs text-text-muted mb-1 px-1 ${
                          message.sender_id === buyer?.id ? 'text-left' : 'text-right'
                        }`}>
                          {message.sender_id === buyer?.id ? '(Buyer)' : '(Seller)'}
                        </div>
                      )}
                      <MessageBubble
                        message={message}
                        isOwn={false}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-frost-ice" />
                Timeline
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Created</span>
                  <span className="text-polar-night">{new Date(order.timestamps.created_at).toLocaleString()}</span>
                </div>
                {order.timestamps.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Paid</span>
                    <span className="text-polar-night">{new Date(order.timestamps.paid_at).toLocaleString()}</span>
                  </div>
                )}
                {order.timestamps.seller_responded_at && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Seller Responded</span>
                    <span className="text-polar-night">{new Date(order.timestamps.seller_responded_at).toLocaleString()}</span>
                  </div>
                )}
                {order.timestamps.label_generated_at && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Label Generated</span>
                    <span className="text-polar-night">{new Date(order.timestamps.label_generated_at).toLocaleString()}</span>
                  </div>
                )}
                {order.timestamps.cancelled_at && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Cancelled</span>
                    <span className="text-aurora-red">{new Date(order.timestamps.cancelled_at).toLocaleString()}</span>
                  </div>
                )}
                {order.timestamps.refunded_at && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Refunded</span>
                    <span className="text-aurora-red">{new Date(order.timestamps.refunded_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
