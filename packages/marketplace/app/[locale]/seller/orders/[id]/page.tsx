'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import { Package, Time as Clock, CheckCircleAlt01 as CheckCircle2, CloseCircle as XCircle, RefreshCw as Loader2, AlertCircle, ArrowLeft, Truck, User, Download, FileText, LinkExternal as ExternalLink, Chat as MessageSquare } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';

interface OrderItem {
  id: string;
  game_name: string;
  price: number;
  condition: string;
  photo_url: string | null;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  status: string;
  shipping_method: 't2t' | 'local_pickup';
  destination_terminal_name?: string;
  destination_terminal_address?: string;
  destination_country?: string;
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
  paid_at: string;
  seller_response_deadline?: string;
  seller_responded_at?: string;
  parcel_size?: 'XS' | 'S' | 'M' | 'L';
  barcode?: string;
  tracking_url?: string;
  label_url?: string;
  label_generated_at?: string;
  order_items: OrderItem[];
  time_remaining_ms: number | null;
  is_expired: boolean;
}

const statusConfig = {
  pending_payment: { label: 'Pending Payment', color: 'default', icon: Clock },
  pending_seller: { label: 'Waiting for Your Response', color: 'warning', icon: Clock },
  accepted: { label: 'Accepted', color: 'trust', icon: CheckCircle2 },
  shipped: { label: 'Shipped', color: 'success', icon: Truck },
  in_transit: { label: 'In Transit', color: 'info', icon: Truck },
  delivered: { label: 'Delivered', color: 'success', icon: Package },
  completed: { label: 'Completed', color: 'default', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'danger', icon: XCircle },
  disputed: { label: 'Disputed', color: 'danger', icon: AlertCircle },
};

export default function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingLabel, setDownloadingLabel] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/orders');
    }
  }, [user, authLoading, router]);

  // Fetch order details
  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/seller/orders/${params.id}`);
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
    if (user) {
      fetchOrder();
    }
  }, [user, params.id]);

  // Download shipping label
  const handleDownloadLabel = async () => {
    if (!order?.label_url) return;

    try {
      setDownloadingLabel(true);

      // Fetch the label PDF
      const response = await fetch(order.label_url);
      if (!response.ok) {
        throw new Error('Failed to download label');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipping-label-${order.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading label:', err);
      alert('Failed to download label. Please try again.');
    } finally {
      setDownloadingLabel(false);
    }
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment;
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

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-aurora-red/10 border border-aurora-red/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-aurora-red font-medium">Error loading order</p>
                <p className="text-sm text-text-secondary mt-1">{error || 'Order not found'}</p>
                <Link href="/seller/orders">
                  <Button variant="ghost" size="sm" className="mt-3">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Orders
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusConfig(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link href="/seller/orders">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
              {order.order_number}
            </h1>
            <Badge variant={statusInfo.color as any}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-text-secondary">Buyer: {order.buyer_name}</p>
          <Link href={`/transactions/${order.id}`} className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              View Transaction & Messages
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Shipping Label Card - For T2T Orders */}
        {order.shipping_method === 't2t' && order.status === 'accepted' && order.label_url && (
          <div className="bg-frost-ice/10 border-2 border-frost-ice/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-frost-ice" />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-polar-night mb-1">
                  Shipping Label Ready
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Your shipping label has been generated. Download it, print it, and attach it to
                  your parcel before dropping it off at a Unisend terminal.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="accent"
                    onClick={handleDownloadLabel}
                    disabled={downloadingLabel}
                  >
                    {downloadingLabel ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Label PDF
                      </>
                    )}
                  </Button>
                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Track Package
                      </Button>
                    </a>
                  )}
                </div>
                {order.barcode && (
                  <div className="mt-4 p-3 bg-snow-white rounded-lg">
                    <p className="text-xs text-text-secondary mb-1">Tracking Number</p>
                    <p className="font-mono text-lg font-bold text-polar-night">
                      {order.barcode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Information */}
        <div className="bg-snow-white border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">Shipping Information</h2>
          <div className="space-y-3">
            {order.shipping_method === 't2t' ? (
              <>
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-frost-ice mt-0.5" />
                  <div>
                    <p className="font-medium text-polar-night">Terminal-to-Terminal Shipping</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {order.destination_terminal_name}
                    </p>
                    <p className="text-sm text-text-muted">{order.destination_terminal_address}</p>
                    {order.parcel_size && (
                      <p className="text-sm text-text-secondary mt-2">
                        Parcel Size: <span className="font-medium">{order.parcel_size}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="pl-8 space-y-2 text-sm">
                  <div>
                    <p className="text-text-secondary">Receiver:</p>
                    <p className="font-medium">{order.receiver_name}</p>
                    <p className="text-text-secondary">{order.receiver_phone}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-frost-ice mt-0.5" />
                  <div>
                    <p className="font-medium text-polar-night">Local Pickup</p>
                    <p className="text-sm text-text-secondary mt-1">{order.pickup_city}</p>
                    {order.pickup_notes && (
                      <p className="text-sm text-text-muted mt-2">{order.pickup_notes}</p>
                    )}
                  </div>
                </div>
                <div className="pl-8 space-y-2 text-sm">
                  <div>
                    <p className="text-text-secondary">Buyer Contact:</p>
                    <p className="font-medium">{order.buyer_name}</p>
                    <p className="text-text-secondary">{order.buyer_phone}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-snow-white border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">
            Order Items ({order.order_items.length})
          </h2>
          <div className="space-y-4">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b border-border-subtle last:border-0 last:pb-0">
                <div className="w-16 h-16 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
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
                <div className="flex-grow">
                  <h3 className="font-medium text-polar-night mb-2">{item.game_name}</h3>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.condition as any} size="sm">
                      {getConditionLabel(item.condition as ListingCondition)}
                    </Badge>
                    <span className="text-lg font-semibold text-polar-night">
                      €{item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-snow-white border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">Pricing Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Items Total:</span>
              <span className="font-medium">€{order.items_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Shipping Cost:</span>
              <span className="font-medium">€{order.shipping_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Platform Service Fee:</span>
              <span className="font-medium text-aurora-red">-€{order.service_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border-subtle">
              <span className="font-semibold text-polar-night">You Receive:</span>
              <span className="text-xl font-bold text-aurora-green">
                €{(order.items_total + order.shipping_cost).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-snow-white border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">Order Timeline</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-frost-ice mt-2" />
              <div>
                <p className="font-medium text-polar-night">Order Placed</p>
                <p className="text-sm text-text-secondary">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            {order.paid_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-frost-ice mt-2" />
                <div>
                  <p className="font-medium text-polar-night">Payment Received</p>
                  <p className="text-sm text-text-secondary">
                    {new Date(order.paid_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {order.seller_responded_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-aurora-green mt-2" />
                <div>
                  <p className="font-medium text-polar-night">Order Accepted</p>
                  <p className="text-sm text-text-secondary">
                    {new Date(order.seller_responded_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {order.label_generated_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-aurora-green mt-2" />
                <div>
                  <p className="font-medium text-polar-night">Shipping Label Generated</p>
                  <p className="text-sm text-text-secondary">
                    {new Date(order.label_generated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
