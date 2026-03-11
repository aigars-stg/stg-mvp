'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import { Package, Time as Clock, RefreshCw as Loader2, AlertCircle, AlertTriangle, ChevronRight } from '@/lib/icons';
import { EmptyStateIcon } from '@/components/common/EmptyStateIcon';
import { useAuth } from '@/lib/auth/AuthContext';
import { getStatusConfig } from '@/components/shipping/ShippingStatusConfig';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { resolveListingImage } from '@/lib/utils/listing-image';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { formatDateCompact } from '@/lib/date-utils';

interface OrderItem {
  id: string;
  game_name: string;
  price: number;
  condition: string;
  photo_url: string | null;
  game_thumbnail: string | null;
  game_image?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  buyer_name: string;
  status: string;
  shipping_method: 't2t';
  destination_terminal_name?: string;
  items_total: number;
  shipping_cost: number;
  total_amount: number;
  platform_commission_cents?: number | null;
  seller_wallet_credit_cents?: number | null;
  created_at: string;
  updated_at: string;
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
  delivered: number;
  disputed: number;
  completed: number;
  cancelled: number;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'shipped' | 'delivered' | 'disputed' | 'completed' | 'cancelled';

interface OrdersTabProps {
  isActive: boolean;
  onPendingCountChange?: (count: number) => void;
}

export function OrdersTab({ isActive, onPendingCountChange }: OrdersTabProps) {
  const { user } = useAuth();
  const t = useTranslations('SellerOrders');
  const tOrders = useTranslations('Orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const lastPendingCount = useRef<number>(-1);

  const fetchOrders = useCallback(async () => {
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
      const pending = data.summary?.pending || 0;
      if (pending !== lastPendingCount.current) {
        lastPendingCount.current = pending;
        onPendingCountChange?.(pending);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  // Silent refresh for background polling
  const fetchOrdersSilent = useCallback(async () => {
    try {
      const response = await fetch('/api/seller/orders');
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || []);
        setSummary(data.summary || null);
        const pending = data.summary?.pending || 0;
        if (pending !== lastPendingCount.current) {
          lastPendingCount.current = pending;
          onPendingCountChange?.(pending);
        }
      }
    } catch {
      // Silent fail for background refresh
    }
  }, [onPendingCountChange]);

  // Visibility-aware polling (30s)
  useEffect(() => {
    if (!user || !isActive) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      intervalId = setInterval(fetchOrdersSilent, 30000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchOrdersSilent();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isActive, fetchOrdersSilent]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending_seller';
    if (activeTab === 'accepted') return order.status === 'accepted';
    if (activeTab === 'shipped') return order.status === 'shipped';
    if (activeTab === 'delivered') return order.status === 'delivered';
    if (activeTab === 'disputed') return order.status === 'disputed';
    if (activeTab === 'completed') return order.status === 'completed';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return false;
  });

  const actionOrders = orders.filter(
    (o) => o.status === 'pending_seller' || o.status === 'disputed'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
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

      {/* Action Required */}
      {actionOrders.length > 0 && (
        <div className="mb-6 bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-aurora-yellow" />
            <h3 className="font-semibold text-polar-night">
              {t('actionRequired.title')} ({actionOrders.length})
            </h3>
          </div>
          <div className="space-y-1">
            {actionOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between py-2 px-3 bg-snow-white rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-semibold text-frost-ice flex-shrink-0">
                    {order.order_number}
                  </span>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-sm text-text-secondary truncate">
                    {order.status === 'pending_seller'
                      ? t('actionRequired.acceptOrDecline')
                      : t('actionRequired.activeDispute')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { key: 'pending' as FilterTab, label: t('tabs.pending'), count: summary?.pending || 0 },
          { key: 'accepted' as FilterTab, label: t('tabs.accepted'), count: summary?.accepted || 0 },
          { key: 'shipped' as FilterTab, label: t('tabs.shipped'), count: summary?.shipped || 0 },
          { key: 'delivered' as FilterTab, label: t('tabs.delivered'), count: summary?.delivered || 0 },
          { key: 'disputed' as FilterTab, label: t('tabs.disputed'), count: summary?.disputed || 0 },
          { key: 'completed' as FilterTab, label: t('tabs.completed'), count: summary?.completed || 0 },
          { key: 'cancelled' as FilterTab, label: t('tabs.cancelled'), count: summary?.cancelled || 0 },
          { key: 'all' as FilterTab, label: t('tabs.all'), count: summary?.total || 0 },
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
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-4">
            <EmptyStateIcon icon={Package} color="frost-ice" />
          </div>
          <h2 className="text-xl font-semibold text-polar-night mb-2">{t('noOrders.title')}</h2>
          <p className="text-text-secondary">
            {activeTab === 'pending'
              ? t('noOrders.pending')
              : t('noOrders.other', { tab: activeTab })}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            const firstItem = order.order_items[0];
            const extraCount = order.order_items.length - 2;
            const gameNames =
              order.order_items
                .slice(0, 2)
                .map((i) => i.game_name)
                .join(', ') +
              (extraCount > 0 ? ` ${t('card.itemsMore', { count: extraCount })}` : '');
            const earnings =
              order.seller_wallet_credit_cents ??
              Math.round(order.items_total * (1 - SELLER_COMMISSION_RATE) * 100);

            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="bg-snow-white border border-border rounded-xl p-3 hover:bg-bg-elevated transition-colors cursor-pointer flex items-start gap-3">
                  {firstItem && (
                    <ListingThumbnail
                      src={resolveListingImage({
                        gameImage: firstItem.game_image,
                        gameThumbnail: firstItem.game_thumbnail,
                        photoUrl: firstItem.photo_url,
                      })}
                      alt={firstItem.game_name}
                      size="lg"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-frost-ice leading-tight">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-polar-night truncate leading-tight mt-0.5">
                      {gameNames}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-xs text-text-secondary">
                        {t('card.to', { name: order.buyer_name })}
                      </span>
                      <span className="text-text-muted text-xs">·</span>
                      <Badge variant={statusConfig.variant} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.labelKey ? tOrders(statusConfig.labelKey) : statusConfig.label}
                      </Badge>
                      {order.status === 'pending_seller' && order.time_remaining_ms !== null && (
                        <>
                          <span className="text-text-muted text-xs">·</span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${
                              order.is_expired
                                ? 'bg-aurora-red/10 text-aurora-red'
                                : 'bg-aurora-yellow/10 text-aurora-yellow'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {order.is_expired
                              ? t('card.expired')
                              : `${Math.floor(order.time_remaining_ms / 3600000)}h ${Math.floor((order.time_remaining_ms % 3600000) / 60000)}m`}
                          </span>
                        </>
                      )}
                      <span className="text-text-muted text-xs">·</span>
                      <span className="text-xs font-medium text-aurora-green">
                        {formatCentsToCurrency(earnings)}
                      </span>
                      <span className="text-text-muted text-xs">·</span>
                      <span className="text-xs text-text-secondary">
                        {formatDateCompact(order.updated_at)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 self-center" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
