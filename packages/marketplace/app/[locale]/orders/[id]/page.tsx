/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Badge, Button } from '@second-turn/design-system';
import {
  Time as Clock,
  CloseCircle as XCircle,
  RefreshCw as Loader2,
  AlertCircle,
  ArrowLeft,
  Chat as MessageSquare,
  CheckCircleAlt01 as CheckCircle,
  AlertTriangle,
  Star,
} from '@/lib/icons';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { resolveListingImage } from '@/lib/utils/listing-image';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import { UserInfoCard } from '@/components/user';
import { OrderActions } from '@/components/orders';
import { useOrderDetail } from '@/lib/hooks/useOrderDetail';
import {
  StatusTimeline,
  ShippingInfoCard,
  TrackingNumberCard,
  TrackingEventsTimeline,
  getStatusConfig,
  isCancelledStatus,
} from '@/components/shipping';

// Valid Badge variants for the design system - used for type assertion
type DesignSystemBadgeVariant = 'trust' | 'likeNew' | 'veryGood' | 'good' | 'acceptable' | 'forParts' | 'success' | 'warning' | 'error' | 'default' | 'outline';
import { formatDate, formatTime } from '@/lib/date-utils';
import { formatPrice } from '@/lib/services/pricing';

export default function OrderDetailPage() {
  const t = useTranslations('Orders.detail');

  // Use extracted hook for all order data and actions
  const {
    data,
    loading,
    error,
    authLoading,
    user,
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

  // Error or not found
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

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  const {
    order,
    order_items,
    tracking_events,
    buyer,
    seller,
    current_user,
    messages,
    conversation,
  } = data;
  const isCancelled = isCancelledStatus(order.status);
  const otherUser = current_user.role === 'buyer' ? seller : buyer;
  const statusInfo = getStatusConfig(order.status);
  const StatusIcon = statusInfo.icon;
  const timeRemainingMs = getTimeRemainingMs();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-frost-ice mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToOrders')}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
                  {t('orderTitle', { orderNumber: order.order_number })}
                </h1>
                <Badge variant={statusInfo.variant as DesignSystemBadgeVariant} size="lg">
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-text-secondary">
                {t('placedAt', {
                  date: formatDate(order.timestamps.created_at),
                  time: formatTime(order.timestamps.created_at),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            {!isCancelled && (
              <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
                <StatusTimeline
                  currentStatus={order.status}
                  timeRemainingMs={timeRemainingMs}
                  title={t('orderStatus')}
                />
              </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="bg-aurora-red/10 border-2 border-aurora-red/20 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-aurora-red flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-aurora-red mb-2">
                      {t('cancelled.title')}
                    </h3>
                    <p className="text-sm text-text-secondary mb-3">
                      {t('cancelled.defaultReason')}
                    </p>
                    {order.timestamps.refunded_at && (
                      <div className="p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg">
                        <p className="text-sm font-medium text-polar-night">
                          {t('cancelled.refundProcessed', {
                            amount: order.total_amount.toFixed(2),
                          })}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {t('cancelled.refundedOn', {
                            date: formatDate(order.timestamps.refunded_at),
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Refunded Notice */}
            {order.status === 'refunded' && (
              <div className="bg-aurora-green/10 border-2 border-aurora-green/20 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-aurora-green flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-aurora-green mb-2">
                      {t('refunded.title')}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {t('refunded.amount', {
                        amount: (order.refund_amount ?? order.total_amount).toFixed(2),
                      })}
                    </p>
                    {order.timestamps.refunded_at && (
                      <p className="text-xs text-text-muted mt-2">
                        {formatDate(order.timestamps.refunded_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Disputed Notice */}
            {order.status === 'disputed' && (
              <div className="bg-aurora-yellow/10 border-2 border-aurora-yellow/20 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-aurora-yellow flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-polar-night mb-2">
                      {t('disputed.title')}
                    </h3>
                    {order.timestamps.disputed_at && (
                      <p className="text-sm text-text-secondary mb-2">
                        {t('disputed.openedOn', {
                          date: formatDate(order.timestamps.disputed_at),
                        })}
                      </p>
                    )}
                    <p className="text-xs text-text-muted">
                      {t('disputed.contactSoon')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Seller Warning */}
            {order.status === 'pending_seller' && timeRemainingMs !== null && (
              <div
                className={`border-2 rounded-xl p-4 sm:p-6 ${
                  timeRemainingMs <= 0
                    ? 'bg-aurora-red/10 border-aurora-red/20'
                    : 'bg-aurora-yellow/10 border-aurora-yellow/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Clock
                    className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                      timeRemainingMs <= 0
                        ? 'text-aurora-red'
                        : 'text-aurora-yellow'
                    }`}
                  />
                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        timeRemainingMs <= 0
                          ? 'text-aurora-red'
                          : 'text-polar-night'
                      }`}
                    >
                      {timeRemainingMs <= 0
                        ? t('pending.expiredTitle')
                        : t('pending.waitingTitle')}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {timeRemainingMs <= 0
                        ? t('pending.expiredDescription')
                        : t('pending.waitingDescription', {
                            hours: Math.floor(timeRemainingMs / 3600000),
                            minutes: Math.floor(
                              (timeRemainingMs % 3600000) / 60000
                            ),
                          })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night mb-4">
                {t('items.title', { count: order_items.length })}
              </h2>
              <div className="space-y-4">
                {order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <ListingThumbnail
                      src={resolveListingImage({ gameThumbnail: item.game_thumbnail, photoUrl: item.photo_url })}
                      alt={item.game_name}
                      size="lg"
                    />
                    <div className="flex-grow min-w-0">
                      <Link
                        href={`/game/${item.game_bgg_id}`}
                        className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2"
                      >
                        {item.game_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={item.condition as ListingCondition} size="sm">
                          {getConditionLabel(item.condition as ListingCondition)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-polar-night">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
              <ShippingInfoCard
                destination={order.destination}
                title={t('shipping.deliveryTitle')}
              />

              {/* Tracking Number */}
              {order.tracking.barcode && (
                <div className="mt-4">
                  <TrackingNumberCard
                    tracking={order.tracking}
                    title={t('shipping.trackingNumber')}
                  />
                </div>
              )}

              {/* Tracking Events */}
              {tracking_events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <TrackingEventsTimeline
                    events={tracking_events}
                    title={t('tracking.title')}
                  />
                </div>
              )}
            </div>

            {/* Action Bar */}
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

            {/* Review CTA */}
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

            {/* Messages Section */}
            <div className="bg-snow-white border border-border rounded-xl overflow-hidden">
              {/* Messages header */}
              <div className="px-4 py-3 border-b border-border-subtle bg-bg-secondary">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-frost-ice" />
                  <h2 className="text-sm font-semibold text-polar-night">
                    Messages
                  </h2>
                  <span className="text-xs text-text-tertiary">
                    ({messages.length})
                  </span>
                </div>
              </div>

              {/* Messages list */}
              <div
                ref={messagesContainerRef}
                className="px-4 py-4 overflow-y-auto"
                style={{ minHeight: '200px', maxHeight: '400px' }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <MessageSquare className="w-12 h-12 text-text-muted mb-3" />
                    <p className="text-text-secondary">No messages yet</p>
                    <p className="text-sm text-text-tertiary mt-1">
                      Start the conversation with{' '}
                      {otherUser?.full_name || 'the other party'}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === user.id}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="border-t border-border-subtle bg-bg-primary px-4 py-3">
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={sendingMessage}
                  placeholder={`Message ${otherUser?.full_name || 'the other party'}...`}
                  conversationId={conversation.id}
                  allowPhotos={true}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold text-polar-night mb-4">
                {t('summary.title')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('summary.items')}</span>
                  <span className="font-medium text-polar-night">
                    {formatPrice(order.items_total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    {t('summary.shipping')}
                  </span>
                  <span className="font-medium">
                    {order.shipping_cost === 0 ? (
                      <span className="text-aurora-green">{t('summary.free')}</span>
                    ) : (
                      <span className="text-polar-night">{formatPrice(order.shipping_cost)}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border-subtle">
                  <span className="font-semibold text-polar-night">
                    {t('summary.totalPaid')}
                  </span>
                  <span className="text-lg font-bold text-polar-night">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Other Party Information */}
            {otherUser && (
              <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-polar-night mb-4">
                  {current_user.role === 'buyer'
                    ? t('seller.title')
                    : 'Buyer'}
                </h3>
                <UserInfoCard
                  user={{
                    id: otherUser.id,
                    name: otherUser.full_name || 'Unknown',
                    avatarUrl: otherUser.avatar_url,
                    country: null,
                  }}
                  size="md"
                  countryDisplay="full"
                />
              </div>
            )}

            {/* Help */}
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
        </div>
      </div>
    </div>
  );
}
