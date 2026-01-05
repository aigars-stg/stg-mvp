'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  Truck,
  User,
} from 'lucide-react';
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
  status: string;
  shipping_method: 't2t' | 'local_pickup';
  destination_terminal_name?: string;
  pickup_city?: string;
  items_total: number;
  shipping_cost: number;
  service_fee: number;
  total_amount: number;
  created_at: string;
  seller_response_deadline?: string;
  order_items: OrderItem[];
  time_remaining_ms: number | null;
  is_expired: boolean;
}

interface OrdersSummary {
  total: number;
  pending: number;
  accepted: number;
  shipped: number;
  completed: number;
  cancelled: number;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'shipped' | 'completed';

export default function SellerOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [decliningOrder, setDecliningOrder] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/orders');
    }
  }, [user, authLoading, router]);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/seller/orders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(data.orders || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Handle accept order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      setAcceptingOrder(orderId);

      const response = await fetch(`/api/seller/orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcelSize: 'M', // Default to M for now, TODO: Add size selector
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept order');
      }

      // Refresh orders
      await fetchOrders();
    } catch (err) {
      console.error('Error accepting order:', err);
      alert(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setAcceptingOrder(null);
    }
  };

  // Handle decline order
  const handleDeclineOrder = async (orderId: string) => {
    try {
      setDecliningOrder(orderId);

      const response = await fetch(`/api/seller/orders/${orderId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: declineReason || 'Seller declined',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline order');
      }

      // Close modal and refresh
      setShowDeclineModal(null);
      setDeclineReason('');
      await fetchOrders();
    } catch (err) {
      console.error('Error declining order:', err);
      alert(err instanceof Error ? err.message : 'Failed to decline order');
    } finally {
      setDecliningOrder(null);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending_seller';
    if (activeTab === 'accepted') return order.status === 'accepted';
    if (activeTab === 'shipped') return order.status === 'shipped';
    if (activeTab === 'completed') return order.status === 'completed';
    return false;
  });

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading your orders...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">Seller Orders</h1>
          <p className="text-text-secondary mt-1">Manage your orders and respond to buyers</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-red font-medium">Error loading orders</p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={fetchOrders} className="mt-2">
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">All Orders</p>
              <p className="text-2xl font-bold text-polar-night mt-1">{summary.total}</p>
            </div>
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">Pending</p>
              <p className="text-2xl font-bold text-aurora-yellow mt-1">{summary.pending}</p>
            </div>
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">Accepted</p>
              <p className="text-2xl font-bold text-frost-ice mt-1">{summary.accepted}</p>
            </div>
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">Shipped</p>
              <p className="text-2xl font-bold text-aurora-green mt-1">{summary.shipped}</p>
            </div>
            <div className="bg-snow-white border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">Completed</p>
              <p className="text-2xl font-bold text-text-muted mt-1">{summary.completed}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'pending' as FilterTab, label: 'Pending', count: summary?.pending || 0 },
            { key: 'accepted' as FilterTab, label: 'Accepted', count: summary?.accepted || 0 },
            { key: 'shipped' as FilterTab, label: 'Shipped', count: summary?.shipped || 0 },
            { key: 'completed' as FilterTab, label: 'Completed', count: summary?.completed || 0 },
            { key: 'all' as FilterTab, label: 'All', count: summary?.total || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                ${
                  activeTab === tab.key
                    ? 'bg-frost-ice text-snow-white'
                    : 'bg-snow-white text-text-secondary hover:bg-bg-elevated border border-border'
                }
              `}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-polar-night mb-2">No orders found</h2>
            <p className="text-text-secondary">
              {activeTab === 'pending'
                ? 'You have no pending orders to review'
                : `No ${activeTab} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-polar-night">
                        {order.order_number}
                      </h3>
                      <Badge
                        variant={
                          order.status === 'pending_seller'
                            ? 'warning'
                            : order.status === 'accepted'
                            ? 'trust'
                            : 'default'
                        }
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Buyer: {order.buyer_name}
                    </p>
                  </div>

                  {/* Time Remaining for Pending Orders */}
                  {order.status === 'pending_seller' && order.time_remaining_ms !== null && (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        order.is_expired
                          ? 'bg-aurora-red/10 text-aurora-red'
                          : order.time_remaining_ms < 3600000
                          ? 'bg-aurora-yellow/10 text-aurora-yellow'
                          : 'bg-frost-ice/10 text-frost-ice'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {order.is_expired
                          ? 'Expired'
                          : `${Math.floor(order.time_remaining_ms / 3600000)}h ${Math.floor(
                              (order.time_remaining_ms % 3600000) / 60000
                            )}m left`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-polar-night mb-2">
                    Items ({order.order_items.length})
                  </p>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.game_name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-text-muted" />
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium text-polar-night line-clamp-1">
                            {item.game_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.condition as any} size="sm">
                              {getConditionLabel(item.condition as ListingCondition)}
                            </Badge>
                            <span className="text-sm font-medium text-polar-night">
                              €{item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Method */}
                <div className="mb-4 p-3 bg-bg-elevated rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    {order.shipping_method === 't2t' ? (
                      <>
                        <Truck className="w-4 h-4 text-frost-ice" />
                        <span className="font-medium">Terminal Pickup:</span>
                        <span className="text-text-secondary">
                          {order.destination_terminal_name}
                        </span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 text-frost-ice" />
                        <span className="font-medium">Local Pickup:</span>
                        <span className="text-text-secondary">{order.pickup_city}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Items:</span>
                    <span className="font-medium">€{order.items_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Shipping:</span>
                    <span className="font-medium">€{order.shipping_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Service Fee:</span>
                    <span className="font-medium text-aurora-red">
                      -€{order.service_fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border-subtle">
                    <span className="font-semibold text-polar-night">You receive:</span>
                    <span className="text-lg font-bold text-aurora-green">
                      €{(order.items_total + order.shipping_cost).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {order.status === 'pending_seller' && !order.is_expired && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="accent"
                      fullWidth
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={acceptingOrder === order.id}
                    >
                      {acceptingOrder === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Accept Order
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setShowDeclineModal(order.id)}
                      disabled={decliningOrder === order.id}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                )}

                {order.status !== 'pending_seller' && (
                  <Link href={`/seller/orders/${order.id}`}>
                    <Button variant="secondary" fullWidth>
                      View Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-snow-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-polar-night mb-4">Decline Order</h3>
            <p className="text-text-secondary mb-4">
              Please provide a reason for declining this order. The buyer will be automatically
              refunded.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Item no longer available"
              className="w-full p-3 border border-border rounded-lg mb-4 min-h-[100px] focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none"
            />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setShowDeclineModal(null);
                  setDeclineReason('');
                }}
                disabled={decliningOrder === showDeclineModal}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleDeclineOrder(showDeclineModal)}
                disabled={decliningOrder === showDeclineModal}
              >
                {decliningOrder === showDeclineModal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Declining...
                  </>
                ) : (
                  'Confirm Decline'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
