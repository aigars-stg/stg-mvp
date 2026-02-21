'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
  CheckCircleAlt01 as CheckCircle,
  Star,
} from '@/lib/icons';
import { UserInfoCard } from '@/components/user';
import { OrderActions } from '@/components/orders';
import { useOrderDetail } from '@/lib/hooks/useOrderDetail';
import { StatusTimeline, isCancelledStatus } from '@/components/shipping';
import {
  OrderDetailHeader,
  OrderStatusNotice,
  OrderItemsList,
  OrderPricingSummary,
  OrderTimeline,
  OrderShippingSection,
  ConversationPanel,
} from '@/components/order-detail';
import type { OrderDetailOrder, OrderDetailItem } from '@/lib/types/order-detail';
import { formatDate, formatTime } from '@/lib/date-utils';

export default function OrderDetailPage() {
  const t = useTranslations('Orders.detail');

  const {
    data,
    loading,
    error,
    authLoading,
    user,
    messages,
    sendingMessage,
    handleSendMessage,
    messagesEndRef,
    messagesContainerRef,
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
    actionError,
    setActionError,
    actionSuccess,
    getTimeRemainingMs,
    hasReview,
  } = useOrderDetail();

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

  const { order, order_items, tracking_events, seller, current_user, conversation } = data;
  const isCancelled = isCancelledStatus(order.status);
  const timeRemainingMs = getTimeRemainingMs();

  return (
    <div className="min-h-screen bg-bg-primary">
      <OrderDetailHeader
        orderNumber={t('orderTitle', { orderNumber: order.order_number })}
        status={order.status}
        subtitle={t('placedAt', {
          date: formatDate(order.timestamps.created_at),
          time: formatTime(order.timestamps.created_at),
        })}
        backHref="/orders"
        backLabel={t('backToOrders')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <OrderPricingSummary
              order={order as OrderDetailOrder}
              viewerRole="buyer"
              title={t('summary.title')}
            />

            {seller && (
              <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  {t('seller.title')}
                </h3>
                <UserInfoCard
                  user={{
                    id: seller.id,
                    name: seller.full_name || 'Unknown',
                    avatarUrl: seller.avatar_url,
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
              title={t('shipping.deliveryTitle')}
            />

            <OrderTimeline timestamps={order.timestamps} />

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
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            {!isCancelled && (
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
              viewerRole="buyer"
              timeRemainingMs={timeRemainingMs}
            />

            <OrderItemsList
              items={order_items as OrderDetailItem[]}
              showGameLinks
              title={t('items.title', { count: order_items.length })}
            />

            {!isCancelled && (
              <OrderActions
                orderStatus={order.status}
                currentUserRole={current_user.role}
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

            {current_user.role === 'buyer' &&
              (order.status === 'delivered' || order.status === 'completed') && (
              <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
                {hasReview === false ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-polar-night">
                          {t('review.title')}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {t('review.description')}
                        </p>
                      </div>
                    </div>
                    <Link href={`/orders/${order.id}/review`}>
                      <Button variant="accent" size="sm">
                        {t('review.button')}
                      </Button>
                    </Link>
                  </div>
                ) : hasReview === true ? (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <CheckCircle className="w-5 h-5 text-aurora-green flex-shrink-0" />
                    <span className="text-sm">{t('review.alreadyReviewed')}</span>
                  </div>
                ) : null}
              </div>
            )}

            <ConversationPanel
              messages={messages}
              currentUserId={user.id}
              otherUserName={seller?.full_name || undefined}
              onSend={handleSendMessage}
              sendingMessage={sendingMessage}
              conversationId={conversation.id}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              title={t('messages.title')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
