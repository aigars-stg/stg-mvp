'use client';

import { useState, useEffect, Suspense } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button, Badge, Card, SegmentedNav } from '@second-turn/design-system';
import { Package, Time as Clock, RefreshCw as Loader2, AlertCircle, AlertTriangle, ChevronRight, ShoppingBag, Store } from '@/lib/icons';
import { EmptyStateIcon } from '@/components/common/EmptyStateIcon';
import { useAuth } from '@/lib/auth/AuthContext';
import { useActiveOrders } from '@/lib/contexts/ActiveOrdersContext';
import { useTranslations } from 'next-intl';
import { formatDateCompact } from '@/lib/date-utils';
import { formatPrice } from '@/lib/services/pricing';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { resolveListingImage } from '@/lib/utils/listing-image';
import { getStatusConfig } from '@/components/shipping';
import { OrdersTab } from '@/components/seller/dashboard/OrdersTab';

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
  updated_at: string;
  seller_response_deadline?: string;
  order_items: OrderItem[];
  time_remaining_ms: number | null;
  is_expired: boolean;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'shipped' | 'delivered' | 'disputed' | 'completed' | 'cancelled';
type RoleTab = 'buying' | 'selling';

function PurchasesTab() {
  const { user } = useAuth();
  const t = useTranslations('Orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending_seller';
    if (activeTab === 'accepted') return order.status === 'accepted';
    if (activeTab === 'shipped') return ['shipped', 'in_transit'].includes(order.status);
    if (activeTab === 'delivered') return order.status === 'delivered';
    if (activeTab === 'disputed') return order.status === 'disputed';
    if (activeTab === 'completed') return order.status === 'completed';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return false;
  });

  const { counts, actionOrders } = orders.reduce(
    (acc, o) => {
      const s = o.status;
      acc.counts.all++;
      if (s === 'pending_seller') acc.counts.pending++;
      else if (s === 'accepted') acc.counts.accepted++;
      else if (s === 'shipped' || s === 'in_transit') acc.counts.shipped++;
      else if (s === 'delivered') { acc.counts.delivered++; acc.actionOrders.push(o); }
      else if (s === 'disputed') { acc.counts.disputed++; acc.actionOrders.push(o); }
      else if (s === 'completed') acc.counts.completed++;
      else if (s === 'cancelled') acc.counts.cancelled++;
      return acc;
    },
    {
      counts: { all: 0, pending: 0, accepted: 0, shipped: 0, delivered: 0, disputed: 0, completed: 0, cancelled: 0 },
      actionOrders: [] as Order[],
    }
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
                    {order.status === 'delivered'
                      ? t('actionRequired.confirmReceipt')
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
          { key: 'pending' as FilterTab, labelKey: 'tabs.pending' },
          { key: 'accepted' as FilterTab, labelKey: 'tabs.accepted' },
          { key: 'shipped' as FilterTab, labelKey: 'tabs.shipped' },
          { key: 'delivered' as FilterTab, labelKey: 'tabs.delivered' },
          { key: 'disputed' as FilterTab, labelKey: 'tabs.disputed' },
          { key: 'completed' as FilterTab, labelKey: 'tabs.completed' },
          { key: 'cancelled' as FilterTab, labelKey: 'tabs.cancelled' },
          { key: 'all' as FilterTab, labelKey: 'tabs.all' },
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
        <Card padding="lg" className="text-center min-h-[40vh] flex flex-col justify-center items-center">
          <div className="mb-4">
            <EmptyStateIcon icon={Package} color="frost-ice" />
          </div>
          <h2 className="text-xl font-semibold text-polar-night mb-2">{t('emptyState.title')}</h2>
          <p className="text-text-secondary mb-6">
            {activeTab === 'all'
              ? t('emptyState.descriptionAll')
              : t('emptyState.descriptionFiltered', { status: t(`tabs.${activeTab}`).toLowerCase() })}
          </p>
          {activeTab === 'all' && (
            <Link href="/browse">
              <Button variant="primary">{t('emptyState.button')}</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusConfig(order.status);
            const StatusIcon = statusInfo.icon;
            const firstItem = order.order_items[0];
            const extraCount = order.order_items.length - 2;
            const gameNames =
              order.order_items
                .slice(0, 2)
                .map((i) => i.game_name)
                .join(', ') +
              (extraCount > 0
                ? ` ${t('orderCard.itemsMore', { count: extraCount })}`
                : '');

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
                        {t('orderCard.from', { name: order.seller_name })}
                      </span>
                      <span className="text-text-muted text-xs">·</span>
                      <Badge variant={statusInfo.variant} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.labelKey ? t(statusInfo.labelKey) : statusInfo.label}
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
                              ? t('orderCard.expired')
                              : `${Math.floor(order.time_remaining_ms / 3600000)}h ${Math.floor((order.time_remaining_ms % 3600000) / 60000)}m`}
                          </span>
                        </>
                      )}
                      <span className="text-text-muted text-xs">·</span>
                      <span className="text-xs font-medium text-polar-night">
                        {formatPrice(order.total_amount)}
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

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { refresh: refreshActiveOrders } = useActiveOrders();
  const t = useTranslations('Orders');

  const isActiveSeller = profile?.seller_status === 'active';

  const roleParam = searchParams.get('role') as RoleTab | null;
  const initialRole: RoleTab =
    !isActiveSeller || roleParam === 'buying' ? 'buying' : 'selling';
  const [activeRole, setActiveRole] = useState<RoleTab>(initialRole);

  const [pendingSellerCount, setPendingSellerCount] = useState(0);

  // Refresh navbar badge count on page mount
  useEffect(() => {
    refreshActiveOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirectTo=/orders');
    }
  }, [user, authLoading, router]);

  // Sync role tab with URL
  const handleRoleChange = (role: RoleTab) => {
    setActiveRole(role);
    const url = new URL(window.location.href);
    if (role === 'selling' && isActiveSeller) {
      url.searchParams.delete('role');
    } else if (role === 'buying') {
      url.searchParams.set('role', 'buying');
    } else {
      url.searchParams.set('role', role);
    }
    window.history.replaceState({}, '', url.toString());
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
          </div>
        </div>

        {/* Role Tab Switcher — only shown for active sellers */}
        {isActiveSeller && (
          <div className="mb-6">
            <SegmentedNav
              items={[
                { value: 'buying', label: t('roleTabs.purchases'), icon: <ShoppingBag className="w-4 h-4" /> },
                { value: 'selling', label: t('roleTabs.sales'), icon: <Store className="w-4 h-4" /> },
              ]}
              activeValue={activeRole}
              className="w-full sm:w-auto"
              renderItem={(item, _isActive, className) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleRoleChange(item.value as RoleTab)}
                  className={`${className} flex-1 justify-center`}
                >
                  <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                  {item.label}
                  {item.value === 'selling' && pendingSellerCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-md bg-aurora-orange text-white min-w-[20px] text-center leading-none">
                      {pendingSellerCount}
                    </span>
                  )}
                </button>
              )}
            />
          </div>
        )}

        {/* Tab Content */}
        {activeRole === 'buying' || !isActiveSeller ? (
          <PurchasesTab />
        ) : (
          <OrdersTab
            isActive={activeRole === 'selling'}
            onPendingCountChange={setPendingSellerCount}
          />
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}
