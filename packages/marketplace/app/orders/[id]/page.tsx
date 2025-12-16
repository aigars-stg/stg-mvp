'use client';

import { useState, useEffect } from 'react';
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
  User,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';

interface OrderItem {
  id: string;
  listing_id: string;
  game_name: string;
  bgg_game_id: number;
  price: number;
  condition: string;
  photo_url: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
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

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  shipping_method: 't2t' | 'local_pickup';
  destination_country?: string;
  destination_terminal_id?: string;
  destination_terminal_name?: string;
  destination_terminal_address?: string;
  sender_country?: string;
  pickup_city?: string;
  pickup_notes?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_email?: string;
  items_total: number;
  shipping_cost: number;
  service_fee: number;
  total_amount: number;
  created_at: string;
  paid_at?: string;
  seller_response_deadline?: string;
  seller_responded_at?: string;
  seller_decline_reason?: string;
  barcode?: string;
  tracking_url?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  refunded_at?: string;
  refund_amount?: number;
  order_items: OrderItem[];
  buyer_profile: UserProfile | null;
  seller_profile: UserProfile | null;
  tracking_events: TrackingEvent[] | null;
  time_remaining_ms: number | null;
  is_expired: boolean;
  viewer_role: 'buyer' | 'seller';
}

const statusSteps = [
  { key: 'placed', label: 'Order Placed', statuses: ['pending_payment', 'pending_seller', 'accepted', 'shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'pending', label: 'Waiting for Seller', statuses: ['pending_seller', 'accepted', 'shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'accepted', label: 'Seller Accepted', statuses: ['accepted', 'shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped', 'in_transit', 'delivered', 'completed'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered', 'completed'] },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/orders');
    }
  }, [user, authLoading, router]);

  // Fetch order details
  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order');
      }

      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && orderId) {
      fetchOrder();
    }
  }, [user, orderId]);

  // Get step status
  const getStepStatus = (step: typeof statusSteps[0]) => {
    if (!order) return 'pending';
    if (order.status === 'cancelled') return 'pending';
    if (step.statuses.includes(order.status)) return 'completed';
    return 'pending';
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || 'Order not found'}
          </h2>
          <Link href="/orders">
            <Button variant="primary">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-frost-ice mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
                Order {order.order_number}
              </h1>
              <p className="text-text-secondary">
                Placed {new Date(order.created_at).toLocaleDateString()} at{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
            <Badge
              variant={
                isCancelled
                  ? 'error'
                  : order.status === 'pending_seller'
                    ? 'warning'
                    : order.status === 'accepted'
                      ? 'trust'
                      : order.status === 'completed'
                        ? 'success'
                        : 'default'
              }
              size="lg"
            >
              {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            {!isCancelled && (
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-polar-night mb-6">Order Status</h2>
                <div className="space-y-4">
                  {statusSteps.map((step, index) => {
                    const status = getStepStatus(step);
                    const isActive = status === 'completed';
                    const isCurrent =
                      index === statusSteps.findIndex((s) => getStepStatus(s) === 'pending');

                    return (
                      <div key={step.key} className="flex gap-4">
                        {/* Icon */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive
                                ? 'bg-frost-ice text-snow-white'
                                : isCurrent
                                  ? 'bg-aurora-yellow/20 text-aurora-yellow border-2 border-aurora-yellow'
                                  : 'bg-bg-secondary text-text-muted'
                              }`}
                          >
                            {isActive ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : isCurrent ? (
                              <Clock className="w-5 h-5" />
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-text-muted" />
                            )}
                          </div>
                          {index < statusSteps.length - 1 && (
                            <div
                              className={`w-0.5 h-12 ${isActive ? 'bg-frost-ice' : 'bg-border-subtle'
                                }`}
                            />
                          )}
                        </div>

                        {/* Label */}
                        <div className="flex-grow pb-8">
                          <p
                            className={`font-medium ${isActive || isCurrent ? 'text-polar-night' : 'text-text-muted'
                              }`}
                          >
                            {step.label}
                          </p>
                          {isCurrent && order.status === 'pending_seller' && order.time_remaining_ms && (
                            <p className="text-sm text-aurora-yellow mt-1">
                              Seller has {Math.floor(order.time_remaining_ms / 3600000)}h{' '}
                              {Math.floor((order.time_remaining_ms % 3600000) / 60000)}m to respond
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="bg-aurora-red/10 border-2 border-aurora-red/20 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-aurora-red flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-aurora-red mb-2">Order Cancelled</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      {order.cancellation_reason || 'This order has been cancelled'}
                    </p>
                    {order.refunded_at && order.refund_amount && (
                      <div className="p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg">
                        <p className="text-sm font-medium text-polar-night">
                          💰 Refund Processed: €{order.refund_amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          Refunded on {new Date(order.refunded_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pending Seller Warning */}
            {order.status === 'pending_seller' && order.time_remaining_ms !== null && (
              <div
                className={`border-2 rounded-xl p-4 sm:p-6 ${order.is_expired
                    ? 'bg-aurora-red/10 border-aurora-red/20'
                    : 'bg-aurora-yellow/10 border-aurora-yellow/20'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <Clock
                    className={`w-6 h-6 flex-shrink-0 mt-0.5 ${order.is_expired ? 'text-aurora-red' : 'text-aurora-yellow'
                      }`}
                  />
                  <div>
                    <h3
                      className={`font-semibold mb-2 ${order.is_expired ? 'text-aurora-red' : 'text-polar-night'
                        }`}
                    >
                      {order.is_expired ? 'Seller Deadline Expired' : 'Waiting for Seller Response'}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {order.is_expired
                        ? 'The seller did not respond within 24 hours. Your refund is being processed automatically.'
                        : `The seller has ${Math.floor(order.time_remaining_ms / 3600000)} hours and ${Math.floor(
                          (order.time_remaining_ms % 3600000) / 60000
                        )} minutes to accept your order. If they don't respond, you'll receive an automatic full refund.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night mb-4">
                Items ({order.order_items.length})
              </h2>
              <div className="space-y-4">
                {order.order_items.map((item) => (
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
                        href={`/game/${item.bgg_game_id}`}
                        className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2"
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
                      <span className="font-bold text-polar-night">€{item.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night mb-4">
                {order.shipping_method === 't2t' ? 'Delivery Information' : 'Pickup Information'}
              </h2>

              {order.shipping_method === 't2t' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg">
                    <MapPin className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-polar-night">
                        {order.destination_terminal_name}
                      </p>
                      {order.destination_terminal_address && (
                        <p className="text-sm text-text-secondary mt-1">
                          {order.destination_terminal_address}
                        </p>
                      )}
                      {order.destination_country && (
                        <p className="text-sm text-text-muted mt-1">
                          {getCountryFlag(order.destination_country)}{' '}
                          {getCountryName(order.destination_country)}
                        </p>
                      )}
                    </div>
                  </div>

                  {order.receiver_name && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-text-muted" />
                        <span className="text-text-secondary">Recipient:</span>
                        <span className="font-medium">{order.receiver_name}</span>
                      </div>
                      {order.receiver_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-text-muted" />
                          <span className="text-text-secondary">Phone:</span>
                          <span className="font-medium">{order.receiver_phone}</span>
                        </div>
                      )}
                      {order.receiver_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-text-muted" />
                          <span className="text-text-secondary">Email:</span>
                          <span className="font-medium">{order.receiver_email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {order.barcode && (
                    <div className="p-4 bg-frost-ice/10 border border-frost-ice/20 rounded-lg">
                      <p className="text-sm font-medium text-polar-night mb-2">Tracking Number</p>
                      <p className="font-mono text-lg font-bold text-frost-ice">{order.barcode}</p>
                      {order.tracking_url && (
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-frost-ice hover:underline mt-2"
                        >
                          Track Package
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg">
                    <User className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-polar-night">
                        Pickup in {order.pickup_city}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        Coordinate with the seller via messaging to arrange the exact meeting
                        location.
                      </p>
                      {order.pickup_notes && (
                        <p className="text-sm text-text-muted mt-2 italic">
                          Note: {order.pickup_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Timeline - Only for T2T orders with tracking */}
          {order.shipping_method === 't2t' && order.tracking_events && order.tracking_events.length > 0 && (
            <div className="lg:col-span-2">
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-polar-night mb-4">Tracking Timeline</h2>
                <div className="space-y-4">
                  {order.tracking_events.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${event.state_type === 'PARCEL_DELIVERED'
                            ? 'bg-aurora-green'
                            : event.state_type === 'ON_THE_WAY' || event.state_type === 'IN_TRANSIT'
                              ? 'bg-frost-ice'
                              : 'bg-text-muted'
                          }`} />
                        {index < order.tracking_events!.length - 1 && (
                          <div className="w-0.5 h-full bg-border-subtle mt-1" style={{ minHeight: '40px' }} />
                        )}
                      </div>

                      {/* Event details */}
                      <div className="flex-grow pb-4">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <p className="font-medium text-polar-night">{event.state_text}</p>
                          <p className="text-sm text-text-muted whitespace-nowrap">
                            {new Date(event.event_timestamp).toLocaleDateString()} {new Date(event.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {event.location && (
                          <p className="text-sm text-text-secondary">{event.location}</p>
                        )}
                        {event.description && event.description !== event.state_text && (
                          <p className="text-sm text-text-muted mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold text-polar-night mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Items</span>
                  <span className="font-medium">€{order.items_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Shipping</span>
                  <span className="font-medium">
                    {order.shipping_cost === 0 ? (
                      <span className="text-aurora-green">Free</span>
                    ) : (
                      `€${order.shipping_cost.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Service Fee</span>
                  <span className="font-medium">€{order.service_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border-subtle">
                  <span className="font-semibold text-polar-night">Total Paid</span>
                  <span className="text-lg font-bold text-polar-night">
                    €{order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Information */}
            {order.seller_profile && (
              <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-polar-night mb-4">Seller</h3>
                <div className="space-y-2">
                  <p className="font-medium text-polar-night">{order.seller_profile.name}</p>
                  {order.seller_profile.country && (
                    <p className="text-sm text-text-secondary">
                      {getCountryFlag(order.seller_profile.country)}{' '}
                      {getCountryName(order.seller_profile.country)}
                    </p>
                  )}
                  {/* TODO: Add link to seller profile when available */}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-polar-night mb-1">Need Help?</p>
                  <p className="text-text-secondary">
                    Contact support if you have any issues with your order.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
