'use client';

import {
  CloseCircle as XCircle,
  CheckCircleAlt01 as CheckCircle,
  AlertTriangle,
  Time as Clock,
} from '@/lib/icons';
import { formatDate } from '@/lib/date-utils';
import type { OrderDetailOrder, ViewerRole } from '@/lib/types/order-detail';

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
  const { status } = order;

  // Cancelled notice
  if (status === 'cancelled') {
    return (
      <div className="bg-aurora-red/10 border-2 border-aurora-red/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-aurora-red flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-aurora-red mb-2">
              Order Cancelled
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              This order has been cancelled and a refund has been initiated.
            </p>
            {order.timestamps.refunded_at && (
              <div className="p-3 bg-aurora-green/10 border border-aurora-green/20 rounded-lg">
                <p className="text-sm font-medium text-polar-night">
                  Refund of &euro;{order.total_amount.toFixed(2)} processed
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
              Refund Processed
            </h3>
            <p className="text-sm text-text-secondary">
              &euro;{(order.refund_amount ?? order.total_amount).toFixed(2)} has been refunded
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
              Order Under Dispute
            </h3>
            {order.timestamps.disputed_at && (
              <p className="text-sm text-text-secondary mb-2">
                Opened on {formatDate(order.timestamps.disputed_at)}
              </p>
            )}
            <p className="text-xs text-text-muted">
              Our team will review this case and contact you soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending seller notice (buyer and staff views)
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
              {isExpired
                ? 'Seller Response Deadline Expired'
                : 'Waiting for Seller'}
            </h3>
            <p className="text-sm text-text-secondary">
              {isExpired
                ? 'The seller did not respond in time. A refund will be processed automatically.'
                : `The seller has ${Math.floor(timeRemainingMs / 3600000)}h ${Math.floor((timeRemainingMs % 3600000) / 60000)}m to respond.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
