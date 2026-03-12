'use client';

import { useTranslations } from 'next-intl';
import {
  CloseCircle as XCircle,
  CheckCircleAlt01 as CheckCircle,
  AlertTriangle,
  Time as Clock,
  Package,
  InfoCircle as Info,
} from '@/lib/icons';
import { formatDate } from '@/lib/date-utils';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import type { OrderDetailOrder, ViewerRole } from '@/lib/types/order-detail';

function mapCancellationReasonToKey(reason?: string | null): string {
  if (!reason) return 'default';
  if (reason.includes('did not respond')) return 'sellerTimeout';
  if (reason.includes('declined')) return 'sellerDeclined';
  if (reason.includes('did not ship')) return 'shippingTimeout';
  if (reason.includes('cancelled before shipping')) return 'sellerCancelled';
  return 'default';
}

interface OrderStatusNoticeProps {
  order: OrderDetailOrder;
  viewerRole: ViewerRole;
  timeRemainingMs?: number | null;
}

export function OrderStatusNotice({
  order,
  viewerRole,
  timeRemainingMs,
}: OrderStatusNoticeProps) {
  const t = useTranslations('Orders.detail');
  const { status } = order;

  // Cancelled notice
  if (status === 'cancelled') {
    const reasonKey = mapCancellationReasonToKey(order.cancellation_reason);
    return (
      <div className="bg-aurora-red/10 border-2 border-aurora-red/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-aurora-red flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-aurora-red mb-2">
              {t('cancelled.title')}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {t(`cancelled.reasons.${reasonKey}`)}
            </p>
            {order.timestamps.refunded_at && (
              <div className="p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg">
                <p className="text-sm font-medium text-polar-night">
                  {t('cancelled.refundProcessed', { amount: order.total_amount.toFixed(2) })}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {formatDate(order.timestamps.refunded_at)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Refunded notice
  if (status === 'refunded') {
    return (
      <div className="bg-aurora-green/10 border-2 border-aurora-green/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-aurora-green flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-aurora-green mb-2">
              {t('refunded.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('refunded.amount', { amount: `€${(order.refund_amount ?? order.total_amount).toFixed(2)}` })}
            </p>
            {order.timestamps.refunded_at && (
              <p className="text-xs text-text-muted mt-2">
                {formatDate(order.timestamps.refunded_at)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Disputed notice
  if (status === 'disputed') {
    return (
      <div className="bg-aurora-yellow/10 border-2 border-aurora-yellow/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-aurora-yellow flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-polar-night mb-2">
              {t('disputed.inProgress')}
            </h3>
            {order.timestamps.disputed_at && (
              <p className="text-sm text-text-secondary mb-2">
                {t('disputed.openedOn', { date: formatDate(order.timestamps.disputed_at) })}
              </p>
            )}
            <p className="text-xs text-text-muted">
              {t('disputed.staffReviewing')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Delivered notice — buyer
  if (status === 'delivered' && viewerRole === 'buyer') {
    return (
      <div className="bg-aurora-green/10 border-2 border-aurora-green/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Package className="w-6 h-6 text-aurora-green flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-polar-night mb-2">
              {t('notices.delivered.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('notices.delivered.body')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Delivered notice — seller
  if (status === 'delivered' && viewerRole === 'seller') {
    return (
      <div className="bg-aurora-green/10 border-2 border-aurora-green/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Package className="w-6 h-6 text-aurora-green flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-polar-night mb-2">
              {t('notices.deliveredSeller.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('notices.deliveredSeller.body')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Accepted notice — buyer
  if (status === 'accepted' && viewerRole === 'buyer') {
    return (
      <div className="bg-frost-ice/10 border-2 border-frost-ice/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-frost-ice flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-polar-night mb-2">
              {t('notices.accepted.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('notices.accepted.body')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Shipped / in_transit notice — buyer
  if ((status === 'shipped' || status === 'in_transit') && viewerRole === 'buyer') {
    return (
      <div className="bg-frost-ice/10 border-2 border-frost-ice/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Package className="w-6 h-6 text-frost-ice flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-polar-night mb-2">
              {t('notices.shipped.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('notices.shipped.body')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Completed notice — buyer
  if (status === 'completed' && viewerRole === 'buyer') {
    return (
      <div className="bg-aurora-green/10 border-2 border-aurora-green/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-aurora-green flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-aurora-green mb-2">
              {t('notices.completed.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('notices.completed.body')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Completed notice — seller
  if (status === 'completed' && viewerRole === 'seller') {
    const sellerCreditCents = order.payment?.seller_wallet_credit_cents;
    return (
      <div className="bg-aurora-green/10 border-2 border-aurora-green/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-aurora-green flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-aurora-green mb-2">
              {t('notices.completedSeller.title')}
            </h3>
            {sellerCreditCents != null && (
              <p className="text-sm text-text-secondary">
                {t('notices.completedSeller.body', { amount: formatCentsToCurrency(sellerCreditCents) })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pending seller notice (buyer view only)
  if (
    status === 'pending_seller' &&
    timeRemainingMs !== null &&
    timeRemainingMs !== undefined &&
    viewerRole !== 'seller'
  ) {
    const isExpired = timeRemainingMs <= 0;
    return (
      <div
        className={`border-2 rounded-xl p-4 sm:p-6 ${
          isExpired
            ? 'bg-aurora-red/10 border-aurora-red/20'
            : 'bg-aurora-yellow/10 border-aurora-yellow/20'
        }`}
      >
        <div className="flex items-start gap-3">
          <Clock
            className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              isExpired ? 'text-aurora-red' : 'text-aurora-yellow'
            }`}
          />
          <div>
            <h3
              className={`font-semibold mb-2 ${
                isExpired ? 'text-aurora-red' : 'text-polar-night'
              }`}
            >
              {isExpired ? t('pending.expiredTitle') : t('pending.waitingTitle')}
            </h3>
            <p className="text-sm text-text-secondary">
              {isExpired
                ? t('pending.expiredDescription')
                : t('pending.waitingDescription', {
                    hours: Math.floor(timeRemainingMs / 3600000),
                    minutes: Math.floor((timeRemainingMs % 3600000) / 60000),
                  })}
            </p>
            {!isExpired && (
              <p className="text-sm text-text-muted mt-2">
                {t('pending.refundProtection')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
