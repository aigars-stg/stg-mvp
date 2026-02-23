'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import { Package, Time as Clock, CheckCircleAlt01 as CheckCircle2, CloseCircle as XCircle, RefreshCw as Loader2, AlertCircle, ChevronRight } from '@/lib/icons';
import { EmptyStateIcon } from '@/components/common/EmptyStateIcon';
import { useAuth } from '@/lib/auth/AuthContext';
import { PARCEL_SIZES } from '@/components/shipping';
import { getStatusConfig } from '@/components/shipping/ShippingStatusConfig';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { resolveListingImage } from '@/lib/utils/listing-image';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { formatDate } from '@/lib/date-utils';

type ParcelSize = 'XS' | 'S' | 'M' | 'L';

interface OrderItem {
  id: string;
  game_name: string;
  price: number;
  condition: string;
  photo_url: string | null;
  game_thumbnail: string | null;
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

interface OrdersTabProps {
  isActive: boolean;
  onPendingCountChange?: (count: number) => void;
}

export function OrdersTab({ isActive, onPendingCountChange }: OrdersTabProps) {
  const { user } = useAuth();
  const t = useTranslations('SellerOrders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');

  // Accept modal state
  const [showAcceptModal, setShowAcceptModal] = useState<string | null>(null);
  const [selectedParcelSize, setSelectedParcelSize] = useState<ParcelSize>('M');
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);
  const [decliningOrder, setDecliningOrder] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError] = useState<string | null>(null);

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
      onPendingCountChange?.(data.summary?.pending || 0);
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
        onPendingCountChange?.(data.summary?.pending || 0);
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

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setAcceptingOrder(orderId);
      setAcceptError(null);

      const response = await fetch(`/api/seller/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelSize: selectedParcelSize }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept order');
      }

      setShowAcceptModal(null);
      setSelectedParcelSize('M');
      await fetchOrders();
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
    try {
      setDecliningOrder(orderId);
      setDeclineError(null);

      const response = await fetch(`/api/seller/orders/${orderId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason || 'Seller declined' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline order');
      }

      setShowDeclineModal(null);
      setDeclineReason('');
      await fetchOrders();
    } catch (err) {
      setDeclineError(err instanceof Error ? err.message : 'Failed to decline order');
    } finally {
      setDecliningOrder(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending_seller';
    if (activeTab === 'accepted') return order.status === 'accepted';
    if (activeTab === 'shipped') return order.status === 'shipped';
    if (activeTab === 'completed') return order.status === 'completed';
    return false;
  });

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

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'pending' as FilterTab, label: t('tabs.pending'), count: summary?.pending || 0 },
          { key: 'accepted' as FilterTab, label: t('tabs.accepted'), count: summary?.accepted || 0 },
          { key: 'shipped' as FilterTab, label: t('tabs.shipped'), count: summary?.shipped || 0 },
          { key: 'completed' as FilterTab, label: t('tabs.completed'), count: summary?.completed || 0 },
          { key: 'all' as FilterTab, label: t('tabs.all'), count: summary?.total || 0 },
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
            const earnings = order.seller_wallet_credit_cents
              ?? Math.round(order.items_total * (1 - SELLER_COMMISSION_RATE) * 100);

            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="bg-snow-white border border-border rounded-xl p-3 sm:p-4 hover:border-frost-ice transition-colors cursor-pointer">
                  {/* Line 1: Thumbnails + Order # + Status + Time remaining */}
                  <div className="flex items-center gap-3">
                    {/* Thumbnails */}
                    <div className="flex -space-x-2 flex-shrink-0">
                      {order.order_items.slice(0, 3).map((item) => (
                        <ListingThumbnail
                          key={item.id}
                          src={resolveListingImage({ gameThumbnail: item.game_thumbnail, photoUrl: item.photo_url })}
                          alt={item.game_name}
                          size="sm"
                        />
                      ))}
                    </div>

                    {/* Order info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-polar-night">
                          {order.order_number}
                        </span>
                        <Badge variant={statusConfig.variant} size="sm">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {/* Time remaining chip for pending */}
                        {order.status === 'pending_seller' && order.time_remaining_ms !== null && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              order.is_expired
                                ? 'bg-aurora-red/10 text-aurora-red'
                                : order.time_remaining_ms < 3600000
                                ? 'bg-aurora-yellow/10 text-aurora-yellow'
                                : 'bg-frost-ice/10 text-frost-ice'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {order.is_expired
                              ? t('card.expired')
                              : t('card.timeRemaining', { hours: Math.floor(order.time_remaining_ms / 3600000), minutes: Math.floor((order.time_remaining_ms % 3600000) / 60000) })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Line 2: Buyer + items + date + earnings */}
                  <div className="flex items-center justify-between mt-2 ml-0 sm:ml-[calc(theme(spacing.3)*3-theme(spacing.2)*2+theme(spacing.3))]">
                    <p className="text-sm text-text-secondary truncate">
                      {order.buyer_name} · {t('card.items', { count: order.order_items.length })} · {formatDate(order.created_at)}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-sm font-semibold text-aurora-green">
                        {formatCentsToCurrency(earnings)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>

                  {/* Line 3: Accept/Decline for pending orders */}
                  {order.status === 'pending_seller' && !order.is_expired && (
                    <div className="flex gap-2 mt-3" onClick={(e) => e.preventDefault()}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowAcceptModal(order.id);
                          setSelectedParcelSize('M');
                          setAcceptError(null);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {t('actions.acceptOrder')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowDeclineModal(order.id);
                          setDeclineError(null);
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {t('actions.decline')}
                      </Button>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-snow-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              {t('acceptModal.title')}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {t('acceptModal.parcelSizeHelp')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('acceptModal.parcelSizeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PARCEL_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setSelectedParcelSize(size.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedParcelSize === size.value
                        ? 'border-frost-ice bg-frost-ice/10'
                        : 'border-border hover:border-frost-ice/50'
                    }`}
                  >
                    <span className="block font-semibold text-polar-night">
                      {size.label}
                    </span>
                    <span className="block text-xs text-text-muted">{size.dimensions}</span>
                  </button>
                ))}
              </div>
            </div>

            {acceptError && (
              <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-aurora-red">{acceptError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setShowAcceptModal(null);
                  setAcceptError(null);
                }}
                disabled={acceptingOrder === showAcceptModal}
              >
                {t('acceptModal.cancel')}
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleAcceptOrder(showAcceptModal)}
                disabled={acceptingOrder === showAcceptModal}
              >
                {acceptingOrder === showAcceptModal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('acceptModal.processing')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('acceptModal.confirmAccept')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-snow-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-polar-night mb-4">{t('declineModal.title')}</h3>
            <p className="text-text-secondary mb-4">
              {t('declineModal.description')}
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={t('declineModal.placeholder')}
              className="w-full p-3 border border-border rounded-lg mb-4 min-h-[100px] focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none"
            />

            {declineError && (
              <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-aurora-red">{declineError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setShowDeclineModal(null);
                  setDeclineReason('');
                  setDeclineError(null);
                }}
                disabled={decliningOrder === showDeclineModal}
              >
                {t('declineModal.cancel')}
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
                    {t('declineModal.declining')}
                  </>
                ) : (
                  t('declineModal.confirmDecline')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
