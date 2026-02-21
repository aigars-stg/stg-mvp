'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import {
  Time as Clock,
  CheckCircleAlt01 as CheckCircle2,
  CloseCircle as XCircle,
  RefreshCw as Loader2,
  AlertCircle,
  ArrowLeft,
  Truck,
  FileText,
  LinkExternal as ExternalLink,
} from '@/lib/icons';
import { useSellerOrderDetail, PARCEL_SIZES } from '@/lib/hooks/useSellerOrderDetail';
import { useOrderMessages } from '@/lib/hooks/useOrderMessages';
import {
  normalizeSellerOrder,
  normalizeSellerOrderItems,
} from '@/lib/adapters/normalize-seller-order';
import {
  OrderDetailHeader,
  OrderStatusNotice,
  OrderItemsList,
  OrderPricingSummary,
  OrderTimeline,
  OrderShippingSection,
  ConversationPanel,
} from '@/components/order-detail';
import { UserInfoCard } from '@/components/user';

interface ConversationProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations('SellerOrderDetail');

  const {
    order,
    loading,
    error,
    authLoading,
    user,
    showAcceptModal,
    setShowAcceptModal,
    showDeclineModal,
    setShowDeclineModal,
    selectedParcelSize,
    setSelectedParcelSize,
    declineReason,
    setDeclineReason,
    actionLoading,
    actionError,
    setActionError,
    timeRemaining,
    retryingLabel,
    retryError,
    handleAcceptOrder,
    handleDeclineOrder,
    handleRetryLabel,
  } = useSellerOrderDetail(params.id);

  // Messaging state — fetch conversation separately
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<ConversationProfile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<ConversationProfile | null>(null);

  const messaging = useOrderMessages({
    conversationId,
    currentUserId: user?.id ?? null,
    buyerProfile,
    sellerProfile,
  });

  // Fetch conversation data when order loads
  useEffect(() => {
    if (!order?.id || !user) return;

    fetch(`/api/transactions/${order.id}/conversation`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setConversationId(data.conversation.id);
        setBuyerProfile(data.buyer);
        setSellerProfile(data.seller);
        messaging.setMessages(data.messages);
        setTimeout(() => messaging.scrollToBottom(false), 100);
      })
      .catch(() => {
        // Non-critical — order detail still works without messaging
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messaging refs are stable
  }, [order?.id, user]);

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

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || t('error.orderNotFound')}
          </h2>
          <Link href="/seller/dashboard?tab=orders">
            <Button variant="accent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToOrders')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const normalized = normalizeSellerOrder(order);
  const normalizedItems = normalizeSellerOrderItems(order.order_items);

  return (
    <div className="min-h-screen bg-bg-primary">
      <OrderDetailHeader
        orderNumber={order.order_number}
        status={order.status}
        subtitle={t('buyer', { name: order.buyer_name })}
        backHref="/seller/dashboard?tab=orders"
        backLabel={t('backToOrders')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <OrderPricingSummary
              order={normalized}
              viewerRole="seller"
              title={t('pricingSummary.title')}
            />

            <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-polar-night mb-3">
                {t('buyerInfo')}
              </h3>
              <UserInfoCard
                user={{
                  id: order.buyer_id,
                  name: order.buyer_name || 'Unknown',
                  avatarUrl: buyerProfile?.avatar_url ?? null,
                  country: null,
                }}
                size="md"
                countryDisplay="full"
              />
            </div>

            <OrderShippingSection
              order={normalized}
              trackingEvents={order.tracking_events || []}
              title={t('shippingInfo.title')}
            />

            <OrderTimeline timestamps={normalized.timestamps} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <OrderStatusNotice
              order={normalized}
              viewerRole="seller"
            />

            {/* Accept/Decline — pending_seller */}
            {order.status === 'pending_seller' && (
              <div className="bg-aurora-yellow/10 border-2 border-aurora-yellow/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-aurora-yellow/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-aurora-yellow" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-polar-night">
                        {t('actionRequired.title')}
                      </h3>
                      {timeRemaining && (
                        <Badge variant={timeRemaining === 'Expired' ? 'error' : 'warning'}>
                          {timeRemaining}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-4">
                      {t('actionRequired.description')}
                    </p>

                    {actionError && (
                      <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                        <p className="text-sm text-aurora-red">{actionError}</p>
                      </div>
                    )}

                    {!showAcceptModal && !showDeclineModal && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="primary"
                          onClick={() => {
                            setShowAcceptModal(true);
                            setShowDeclineModal(false);
                            setActionError(null);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {t('actionRequired.acceptOrder')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setShowDeclineModal(true);
                            setShowAcceptModal(false);
                            setActionError(null);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {t('actionRequired.declineOrder')}
                        </Button>
                      </div>
                    )}

                    {/* Accept form */}
                    {showAcceptModal && (
                      <div className="p-4 bg-snow-white border border-border rounded-lg">
                        <h4 className="font-semibold text-polar-night mb-3">
                          {t('acceptModal.title')}
                        </h4>
                        {order.shipping_method === 't2t' && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              {t('acceptModal.parcelSizeLabel')}
                            </label>
                            <p className="text-xs text-text-muted mb-3">
                              {t('acceptModal.parcelSizeHelp')}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                  <span className="block text-xs text-text-muted">
                                    {size.dimensions}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button
                            variant="primary"
                            onClick={handleAcceptOrder}
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
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
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowAcceptModal(false);
                              setActionError(null);
                            }}
                            disabled={actionLoading}
                          >
                            {t('acceptModal.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Decline form */}
                    {showDeclineModal && (
                      <div className="p-4 bg-snow-white border border-border rounded-lg">
                        <h4 className="font-semibold text-polar-night mb-3">
                          {t('declineModal.title')}
                        </h4>
                        <p className="text-sm text-text-secondary mb-4">
                          {t('declineModal.description')}
                        </p>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            {t('declineModal.reasonLabel')}
                          </label>
                          <textarea
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder={t('declineModal.reasonPlaceholder')}
                            className="w-full p-3 border border-border rounded-lg text-sm resize-none"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="danger"
                            onClick={handleDeclineOrder}
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('declineModal.processing')}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                {t('declineModal.declineAndRefund')}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowDeclineModal(false);
                              setActionError(null);
                              setDeclineReason('');
                            }}
                            disabled={actionLoading}
                          >
                            {t('declineModal.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Label generation failed */}
            {order.shipping_method === 't2t' && order.status === 'accepted' && !order.label_url && (
              <div className="bg-aurora-red/10 border-2 border-aurora-red/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-aurora-red/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-aurora-red" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-polar-night mb-1">
                      {t('labelFailed.title')}
                    </h3>
                    <p className="text-sm text-text-secondary mb-2">
                      {t('labelFailed.description')}
                    </p>
                    {order.label_error && (
                      <p className="text-sm text-aurora-red mb-4 p-2 bg-aurora-red/10 rounded">
                        Error: {order.label_error}
                      </p>
                    )}
                    {retryError && (
                      <p className="text-sm text-aurora-red mb-4 p-2 bg-aurora-red/10 rounded">
                        Retry failed: {retryError}
                      </p>
                    )}
                    <Button
                      variant="primary"
                      onClick={handleRetryLabel}
                      disabled={retryingLabel}
                    >
                      {retryingLabel ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('labelFailed.generatingLabel')}
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          {t('labelFailed.retryLabelGeneration')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Ready to ship */}
            {order.shipping_method === 't2t' && order.status === 'accepted' && order.label_url && (
              <div className="bg-frost-ice/10 border-2 border-frost-ice/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-frost-ice" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-polar-night mb-1">
                      {t('readyToShip.title')}
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">
                      {t('readyToShip.description')}
                    </p>

                    <div className="mb-4 p-4 bg-snow-white rounded-lg border-2 border-frost-ice">
                      <p className="text-xs text-text-secondary mb-1">{t('readyToShip.parcelId')}</p>
                      <p className="font-mono text-2xl font-bold text-frost-ice">
                        {order.unisend_parcel_id || order.label_url?.replace('unisend://terminal/', '') || order.barcode}
                      </p>
                    </div>

                    <div className="space-y-3 mb-4">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">
                            {step}
                          </div>
                          <p className="text-sm text-text-secondary">
                            {t.rich(`readyToShip.step${step}`, {
                              strong: (chunks) => <strong className="text-polar-night">{chunks}</strong>,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>

                    {order.barcode && order.tracking_url && (
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {t('readyToShip.trackPackage')}
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <OrderItemsList
              items={normalizedItems}
              title={t('orderItems', { count: order.order_items.length })}
            />

            {/* Inline messaging */}
            {conversationId && (
              <ConversationPanel
                messages={messaging.messages}
                currentUserId={user?.id ?? null}
                otherUserName={order.buyer_name}
                onSend={messaging.handleSendMessage}
                sendingMessage={messaging.sendingMessage}
                conversationId={conversationId}
                messagesEndRef={messaging.messagesEndRef}
                messagesContainerRef={messaging.messagesContainerRef}
                title={t('messages')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
