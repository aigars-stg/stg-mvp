'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
} from '@/lib/icons';
import { UserInfoCard } from '@/components/user';
import { OrderActions } from '@/components/orders';
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
  const t = useTranslations('Orders.detail');
  const tSeller = useTranslations('SellerOrderDetail');

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
    selectedParcelSize,
    setSelectedParcelSize,
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
        subtitle={
          isSeller
            ? tSeller('buyer', { name: buyer?.full_name || 'Unknown' })
            : t('placedAt', {
                date: formatDate(order.timestamps.created_at),
                time: formatTime(order.timestamps.created_at),
              })
        }
        backHref="/orders"
        backLabel={t('backToOrders')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <OrderPricingSummary
              order={order as OrderDetailOrder}
              viewerRole={viewerRole || 'buyer'}
              title={isSeller ? tSeller('pricingSummary.title') : t('summary.title')}
            />

            {otherParty && (
              <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  {isSeller ? tSeller('buyerInfo') : t('seller.title')}
                </h3>
                <UserInfoCard
                  user={{
                    id: otherParty.id,
                    name: otherParty.full_name || 'Unknown',
                    avatarUrl: otherParty.avatar_url,
                    country: null,
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
          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            {isBuyer && !isCancelled && (
              <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
                <StatusTimeline
                  currentStatus={order.status}
                  timeRemainingMs={timeRemainingMs}
                  title={t('orderStatus')}
                />
              </div>
            )}

            <OrderStatusNotice
              order={order as OrderDetailOrder}
              viewerRole={viewerRole || 'buyer'}
              timeRemainingMs={timeRemainingMs}
            />

            {/* Seller: Accept/Decline */}
            {isSeller && order.status === 'pending_seller' && (
              <SellerAcceptDecline
                shippingMethod={order.shipping_method}
                timeRemaining={timeRemaining}
                showAcceptModal={showAcceptModal}
                setShowAcceptModal={setShowAcceptModal}
                showDeclineModal={showDeclineModal}
                setShowDeclineModal={setShowDeclineModal}
                selectedParcelSize={selectedParcelSize}
                setSelectedParcelSize={setSelectedParcelSize}
                declineReason={declineReason}
                setDeclineReason={setDeclineReason}
                actionLoading={actionLoading}
                actionError={actionError}
                setActionError={setActionError}
                handleAcceptOrder={handleAcceptOrder}
                handleDeclineOrder={handleDeclineOrder}
              />
            )}

            {/* Seller: Label generation failed */}
            {isSeller && order.shipping_method === 't2t' && order.status === 'accepted' && !order.tracking.label_url && (
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

            {isBuyer && (order.status === 'delivered' || order.status === 'completed') && (
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
