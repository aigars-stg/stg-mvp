'use client';

import { formatPrice, formatCentsToCurrency } from '@/lib/services/pricing';
import type { OrderDetailOrder, ViewerRole } from '@/lib/types/order-detail';

interface OrderPricingSummaryProps {
  order: OrderDetailOrder;
  viewerRole: ViewerRole;
  title?: string;
}

export function OrderPricingSummary({
  order,
  viewerRole,
  title = 'Order Summary',
}: OrderPricingSummaryProps) {
  const commissionCents = order.payment?.platform_commission_cents;
  const sellerCreditCents = order.payment?.seller_wallet_credit_cents;

  return (
    <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
      <h3 className="font-semibold text-polar-night mb-4">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Items</span>
          <span className="font-medium text-polar-night">
            {formatPrice(order.items_total)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Shipping</span>
          <span className="font-medium">
            {order.shipping_cost === 0 ? (
              <span className="text-aurora-green">Free</span>
            ) : (
              <span className="text-polar-night">
                {formatPrice(order.shipping_cost)}
              </span>
            )}
          </span>
        </div>

        {/* Seller view: show commission and net earnings */}
        {viewerRole === 'seller' && (
          <>
            <div className="flex justify-between">
              <span className="text-text-secondary">
                Platform commission
              </span>
              <span className="font-medium text-aurora-red">
                -{commissionCents != null
                  ? formatCentsToCurrency(commissionCents)
                  : formatPrice(order.items_total * 0.1)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border-subtle">
              <span className="font-semibold text-polar-night">
                You receive
              </span>
              <span className="text-xl font-bold text-aurora-green">
                {sellerCreditCents != null
                  ? formatCentsToCurrency(sellerCreditCents)
                  : formatPrice(order.items_total * 0.9)}
              </span>
            </div>
          </>
        )}

        {/* Buyer view: just total paid */}
        {viewerRole === 'buyer' && (
          <div className="flex justify-between pt-2 border-t border-border-subtle">
            <span className="font-semibold text-polar-night">Total paid</span>
            <span className="text-lg font-bold text-polar-night">
              {formatPrice(order.total_amount)}
            </span>
          </div>
        )}

        {/* Staff view: total + commission breakdown */}
        {viewerRole === 'staff' && (
          <>
            <div className="flex justify-between font-semibold text-polar-night pt-1">
              <span>Total</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
            {commissionCents != null && commissionCents > 0 && (
              <div className="flex justify-between text-text-secondary pt-2 border-t border-border-subtle">
                <span>Commission (10%)</span>
                <span className="text-polar-night">
                  {formatCentsToCurrency(commissionCents)}
                </span>
              </div>
            )}
            {sellerCreditCents != null && sellerCreditCents > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Seller credit</span>
                <span className="text-aurora-green">
                  {formatCentsToCurrency(sellerCreditCents)}
                </span>
              </div>
            )}
            {order.refund_amount != null && order.refund_amount > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Refund</span>
                <span className="text-aurora-red">
                  {formatPrice(order.refund_amount)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
