'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
  AlertTriangle,
  Time as Clock,
  CheckCircleAlt01 as CheckCircle,
  CloseCircle as XIcon,
  Email as Mail,
} from '@/lib/icons';
import { UserInfoCard } from '@/components/user';
import { OrderActions } from '@/components/orders';
import { DisputeResponseForm } from '@/components/seller/DisputeResponseForm';
import { useUnifiedOrderDetail } from '@/lib/hooks/useUnifiedOrderDetail';
import { StatusTimeline, isCancelledStatus } from '@/components/shipping';
import {
  OrderDetailHeader,
  OrderStatusNotice,
  OrderItemsList,
  OrderPricingSummary,
  OrderTimeline,
  OrderShippingSection,
  ConversationPanel,
  SellerAcceptDecline,
  SellerLabelFailed,
  SellerReadyToShip,
  BuyerReviewCTA,
} from '@/components/order-detail';
import type { OrderDetailOrder, OrderDetailItem } from '@/lib/types/order-detail';
import { formatDate, formatTime } from '@/lib/date-utils';

export default function OrderDetailPage() {
  const locale = useLocale();
  const t = useTranslations('Orders.detail');
  const tSeller = useTranslations('SellerOrderDetail');
  const searchParams = useSearchParams();

  const isWelcome = searchParams.get('welcome') === 'true';
  const [showWelcome, setShowWelcome] = useState(isWelcome);

  useEffect(() => {
    if (isWelcome) {
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data,
    viewerRole,
    loading,
    error,
    authLoading,
    user,
    // Messages
    messages,
    sendingMessage,
    handleSendMessage,
    messagesEndRef,
    messagesContainerRef,
    // Buyer actions
    confirmingReceipt,
    handleConfirmReceipt,
    showReportIssue,
    setShowReportIssue,
    reportingIssue,
    issueType,
    setIssueType,
    issueDescription,
    setIssueDescription,
    handleReportIssue,
    hasReview,
    // Seller actions
    showAcceptModal,
    setShowAcceptModal,
    showDeclineModal,
    setShowDeclineModal,
    declineReason,
    setDeclineReason,
    actionLoading,
    handleAcceptOrder,
    handleDeclineOrder,
    retryingLabel,
    retryError,
    handleRetryLabel,
    // Shared
    actionError,
    setActionError,
    actionSuccess,
    getTimeRemainingMs,
    timeRemaining,
  } = useUnifiedOrderDetail();

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

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || t('notFound')}
          </h2>
          <Link href="/orders">
            <Button variant="accent">{t('backToOrders')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const { order, order_items, tracking_events, buyer, seller, conversation } = data;
  const isBuyer = viewerRole === 'buyer';
  const isSeller = viewerRole === 'seller';
  const isCancelled = isCancelledStatus(order.status);
  const timeRemainingMs = getTimeRemainingMs();
  const otherParty = isBuyer ? seller : buyer;

  return (
    <div className="min-h-screen bg-bg-primary">
      <OrderDetailHeader
        orderNumber={t('orderTitle', { orderNumber: order.order_number })}
        status={order.status}
        subtitle={t('placedAt', {
          date: formatDate(order.timestamps.created_at),
          time: formatTime(order.timestamps.created_at, locale),
        })}
        backHref={isSeller ? '/orders?role=selling' : '/orders'}
        backLabel={t('backToOrders')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {showWelcome && (
          <div className="bg-aurora-green/10 border border-aurora-green/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
              <div className="flex-grow">
                <p className="font-medium text-polar-night">
                  {t('welcome.title')}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {t('welcome.subtitle')}
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
                  <Mail className="w-4 h-4" />
                  {t('welcome.emailSent')}
                </div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {!isCancelled && order.status !== 'disputed' && (
          <div className="bg-snow-white border border-border rounded-xl p-4 mb-4">
            <StatusTimeline
              currentStatus={order.status}
              variant="horizontal"
              timeRemainingMs={timeRemainingMs}
              timeRemainingLabel={
                timeRemainingMs && timeRemainingMs > 0
                  ? t('statusTimeline.remaining', {
                      hours: Math.floor(timeRemainingMs / 3600000),
                      minutes: Math.floor((timeRemainingMs % 3600000) / 60000),
                    })
                  : undefined
              }
              title={t('orderStatus')}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
            <OrderPricingSummary
              order={order as OrderDetailOrder}
              viewerRole={viewerRole || 'buyer'}
              title={isSeller ? tSeller('pricingSummary.title') : t('summary.title')}
            />

            {otherParty && (
              <div className="bg-snow-white border border-border rounded-xl p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  {isSeller ? tSeller('buyerInfo') : t('seller.title')}
                </h3>
                <UserInfoCard
                  user={{
                    id: otherParty.id,
                    name: otherParty.full_name || 'Unknown',
                    avatarUrl: otherParty.avatar_url,
                    country: otherParty.country ?? null,
                  }}
                  size="md"
                  countryDisplay="full"
                />
              </div>
            )}

            <OrderShippingSection
              order={order as OrderDetailOrder}
              trackingEvents={tracking_events}
              title={isSeller ? tSeller('shippingInfo.title') : t('shipping.deliveryTitle')}
              showBarcode={isSeller}
              showPhone={!isSeller}
            />

            <OrderTimeline timestamps={order.timestamps} />

            {isBuyer && (
              <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-polar-night mb-1">
                      {t('help.title')}
                    </p>
                    <p className="text-text-secondary">{t('help.description')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
            <OrderStatusNotice
              order={order as OrderDetailOrder}
              viewerRole={viewerRole || 'buyer'}
              timeRemainingMs={timeRemainingMs}
            />

            {/* Dispute status section */}
            {order.status === 'disputed' && order.dispute && (
              <div className="bg-aurora-red/5 border border-aurora-red/20 rounded-xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-aurora-red" />
                  <h3 className="font-semibold text-polar-night">{t('disputed.inProgress')}</h3>
                  <Badge variant={
                    order.dispute.status === 'awaiting_seller' ? 'warning' :
                    order.dispute.status === 'under_review' ? 'default' :
                    order.dispute.status === 'resolved' ? 'success' : 'default'
                  } size="sm">
                    {order.dispute.status === 'awaiting_seller' ? t('disputed.awaitingSeller') :
                     order.dispute.status === 'under_review' ? t('disputed.underReview') :
                     order.dispute.status === 'resolved' ? t('disputed.resolved') : order.dispute.status}
                  </Badge>
                </div>

                {/* Buyer view: show dispute details */}
                {isBuyer && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-text-muted">{t('disputed.yourReport')}</p>
                      <p className="text-sm font-medium text-polar-night">{order.dispute.reason}</p>
                      <p className="text-sm text-text-secondary mt-1">{order.dispute.description}</p>
                    </div>
                    {order.dispute.status === 'awaiting_seller' && order.dispute.seller_deadline && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Clock className="w-4 h-4" />
                        {t('disputed.awaitingDeadline', { date: formatDate(order.dispute.seller_deadline) })}
                      </div>
                    )}
                    {order.dispute.status === 'under_review' && (
                      <p className="text-sm text-text-secondary">
                        {t('disputed.underReview')}
                      </p>
                    )}
                  </div>
                )}

                {/* Seller view: show response form or dispute info */}
                {isSeller && order.dispute.status === 'awaiting_seller' && (
                  <DisputeResponseForm
                    orderId={order.id}
                    orderNumber={order.order_number}
                    buyerReason={order.dispute.reason}
                    buyerDescription={order.dispute.description}
                    deadline={order.dispute.seller_deadline || ''}
                    alreadyResponded={!!order.dispute.seller_responded_at}
                    existingResponse={order.dispute.seller_response}
                  />
                )}

                {isSeller && order.dispute.status === 'under_review' && (
                  <div className="space-y-3">
                    {order.dispute.seller_response && (
                      <div>
                        <p className="text-xs text-text-muted">{t('disputed.yourResponse')}</p>
                        <p className="text-sm text-text-secondary">{order.dispute.seller_response}</p>
                      </div>
                    )}
                    <p className="text-sm text-text-secondary">
                      {t('disputed.staffReviewing')}
                    </p>
                  </div>
                )}

                {order.dispute.status === 'resolved' && order.dispute.resolution_note && (
                  <div className="pt-3 border-t border-aurora-red/10">
                    <p className="text-xs text-text-muted">{t('disputed.resolution')}</p>
                    <p className="text-sm text-text-secondary">{order.dispute.resolution_note}</p>
                  </div>
                )}
              </div>
            )}

            {/* Seller: Accept/Decline */}
            {isSeller && order.status === 'pending_seller' && (
              <SellerAcceptDecline
                timeRemaining={timeRemaining}
                showAcceptModal={showAcceptModal}
                setShowAcceptModal={setShowAcceptModal}
                showDeclineModal={showDeclineModal}
                setShowDeclineModal={setShowDeclineModal}
                declineReason={declineReason}
                setDeclineReason={setDeclineReason}
                actionLoading={actionLoading}
                actionError={actionError}
                setActionError={setActionError}
                handleAcceptOrder={handleAcceptOrder}
                handleDeclineOrder={handleDeclineOrder}
              />
            )}

            {/* Seller: Label generating (brief transitional state) */}
            {isSeller && order.status === 'accepted' && !order.tracking.label_url && !order.label_error && (
              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-frost-ice animate-spin flex-shrink-0" />
                  <p className="text-sm text-text-secondary">{t('labelGenerating')}</p>
                </div>
              </div>
            )}

            {/* Seller: Label generation failed */}
            {isSeller && order.shipping_method === 't2t' && order.status === 'accepted' && !order.tracking.label_url && !!order.label_error && (
              <SellerLabelFailed
                labelError={order.label_error}
                retryError={retryError}
                retryingLabel={retryingLabel}
                handleRetryLabel={handleRetryLabel}
              />
            )}

            {/* Seller: Ready to ship */}
            {isSeller && order.shipping_method === 't2t' && order.status === 'accepted' && order.tracking.label_url && (
              <SellerReadyToShip
                unisendParcelId={order.tracking.parcel_id}
                labelUrl={order.tracking.label_url}
                barcode={order.tracking.barcode}
                trackingUrl={order.tracking.tracking_url}
              />
            )}

            <OrderItemsList
              items={order_items as OrderDetailItem[]}
              showGameLinks={isBuyer}
              title={t('items.title', { count: order_items.length })}
            />

            {isBuyer && !isCancelled && (
              <OrderActions
                orderStatus={order.status}
                currentUserRole="buyer"
                confirmingReceipt={confirmingReceipt}
                onConfirmReceipt={handleConfirmReceipt}
                showReportIssue={showReportIssue}
                onShowReportIssue={setShowReportIssue}
                reportingIssue={reportingIssue}
                issueType={issueType}
                onIssueTypeChange={setIssueType}
                issueDescription={issueDescription}
                onIssueDescriptionChange={setIssueDescription}
                onReportIssue={handleReportIssue}
                actionError={actionError}
                actionSuccess={actionSuccess}
                onClearError={() => setActionError(null)}
              />
            )}

            {isBuyer && order.status === 'completed' && (
              <BuyerReviewCTA orderId={order.id} hasReview={hasReview} />
            )}

            <ConversationPanel
              messages={messages}
              currentUserId={user.id}
              otherUserName={otherParty?.full_name || undefined}
              onSend={handleSendMessage}
              sendingMessage={sendingMessage}
              conversationId={conversation.id}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              title={isSeller ? tSeller('messages') : t('messages.title')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
