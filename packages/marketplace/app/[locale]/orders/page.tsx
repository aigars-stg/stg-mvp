/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge, Card } from '@second-turn/design-system';
import { Package, Time as Clock, CheckCircleAlt01 as CheckCircle2, CloseCircle as XCircle, RefreshCw as Loader2, AlertCircle, ChevronRight, Truck, User, ShoppingBag } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
// ListingCondition type available via @/lib/types/listing if needed
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/date-utils';

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
  seller_id: string;
  seller_name: string;
  status: string;
  shipping_method: 't2t' | 'local_pickup';
  destination_terminal_name?: string;
  pickup_city?: string;
  items_total: number;
  shipping_cost: number;
  total_amount: number;
  created_at: string;
  seller_response_deadline?: string;
  order_items: OrderItem[];
  time_remaining_ms: number | null;
  is_expired: boolean;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'shipped' | 'completed' | 'cancelled';

const statusConfig = {
  pending_payment: { label: 'Pending Payment', color: 'default', icon: Clock },
  pending_seller: { label: 'Waiting for Seller', color: 'warning', icon: Clock },
  accepted: { label: 'Accepted', color: 'trust', icon: CheckCircle2 },
  shipped: { label: 'Shipped', color: 'success', icon: Truck },
  in_transit: { label: 'In Transit', color: 'info', icon: Truck },
  delivered: { label: 'Delivered', color: 'success', icon: Package },
  completed: { label: 'Completed', color: 'default', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'danger', icon: XCircle },
  disputed: { label: 'Disputed', color: 'danger', icon: AlertCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations('Orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/orders');
    }
  }, [user, authLoading, router]);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/orders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(data.orders || []);
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

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending_seller';
    if (activeTab === 'accepted') return order.status === 'accepted';
    if (activeTab === 'shipped') return ['shipped', 'in_transit'].includes(order.status);
    if (activeTab === 'completed') return order.status === 'completed';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return false;
  });

  // Count orders by status
  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending_seller').length,
    accepted: orders.filter((o) => o.status === 'accepted').length,
    shipped: orders.filter((o) => ['shipped', 'in_transit'].includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
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
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
          </div>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-red font-medium">{t('error.title')}</p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={fetchOrders} className="mt-2">
                {t('error.tryAgain')}
              </Button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all' as FilterTab, labelKey: 'tabs.all' },
            { key: 'pending' as FilterTab, labelKey: 'tabs.pending' },
            { key: 'accepted' as FilterTab, labelKey: 'tabs.accepted' },
            { key: 'shipped' as FilterTab, labelKey: 'tabs.shipped' },
            { key: 'completed' as FilterTab, labelKey: 'tabs.completed' },
            { key: 'cancelled' as FilterTab, labelKey: 'tabs.cancelled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                ${activeTab === tab.key
                  ? 'bg-frost-ice text-snow-white'
                  : 'bg-snow-white text-text-secondary hover:bg-bg-elevated border border-border'
                }
              `}
            >
              {t(tab.labelKey)} ({counts[tab.key]})
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card padding="lg" className="text-center min-h-[60vh] flex flex-col justify-center items-center">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-polar-night mb-2">{t('emptyState.title')}</h2>
            <p className="text-text-secondary mb-6">
              {activeTab === 'all'
                ? t('emptyState.descriptionAll')
                : t('emptyState.descriptionFiltered', { status: t(`tabs.${activeTab}`).toLowerCase() })}
            </p>
            {activeTab === 'all' && (
              <Link href="/browse">
                <Button variant="accent">{t('emptyState.button')}</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusConfig(order.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6 hover:border-frost-ice transition-colors cursor-pointer">
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-polar-night">
                            {order.order_number}
                          </h3>
                          <Badge variant={statusInfo.color as 'default' | 'warning' | 'trust' | 'success' | 'error'}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">
                          {t('orderCard.seller', { name: order.seller_name })}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {t('orderCard.ordered', { date: formatDate(order.created_at) })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-text-secondary">{t('orderCard.total')}</p>
                        <p className="text-xl font-bold text-polar-night">
                          €{order.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Waiting for Seller Alert */}
                    {order.status === 'pending_seller' && order.time_remaining_ms !== null && (
                      <div
                        className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${order.is_expired
                          ? 'bg-aurora-red/10 border border-aurora-red/20'
                          : 'bg-aurora-yellow/10 border border-aurora-yellow/20'
                          }`}
                      >
                        <Clock
                          className={`w-4 h-4 flex-shrink-0 ${order.is_expired ? 'text-aurora-red' : 'text-aurora-yellow'
                            }`}
                        />
                        <div className="flex-grow min-w-0">
                          <p
                            className={`text-sm font-medium ${order.is_expired ? 'text-aurora-red' : 'text-polar-night'
                              }`}
                          >
                            {order.is_expired
                              ? t('orderCard.sellerDeadlineExpired')
                              : t('orderCard.sellerTimeRemaining', {
                                  hours: Math.floor(order.time_remaining_ms / 3600000),
                                  minutes: Math.floor((order.time_remaining_ms % 3600000) / 60000)
                                })}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Order Items Preview */}
                    <div className="mb-4">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {order.order_items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex-shrink-0 w-16 h-16 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden"
                          >
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
                        ))}
                        {order.order_items.length > 3 && (
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-bg-secondary flex items-center justify-center">
                            <span className="text-sm font-medium text-text-secondary">
                              +{order.order_items.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-2">
                        {t('orderCard.items', { count: order.order_items.length })}
                      </p>
                    </div>

                    {/* Shipping Method */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        {order.shipping_method === 't2t' ? (
                          <>
                            <Truck className="w-4 h-4" />
                            <span>{t('orderCard.terminalPickup')}</span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            <span>{t('orderCard.localPickup')}</span>
                          </>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
