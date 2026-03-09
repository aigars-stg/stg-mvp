'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Download } from '@/lib/icons';
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
  const locale = useLocale();
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
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border-subtle">
              <span className="font-semibold text-polar-night">
                You receive
              </span>
              <span className="text-xl font-bold text-aurora-green">
                {sellerCreditCents != null
                  ? formatCentsToCurrency(sellerCreditCents)
                  : '—'}
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

      {/* Document links */}
      {(['completed', 'refunded'].includes(order.status)) && (() => {
        const links: { href: string; label: string }[] = [];
        if (viewerRole === 'seller' || viewerRole === 'staff') {
          if (order.invoice_number) {
            links.push({ href: `/${locale}/orders/${order.id}/invoice`, label: viewerRole === 'seller' ? 'View invoice' : 'Invoice' });
          }
          if (order.credit_note_number) {
            links.push({ href: `/${locale}/orders/${order.id}/credit-note`, label: viewerRole === 'seller' ? 'View credit note' : 'Credit note' });
          }
        }
        if (viewerRole === 'buyer' || viewerRole === 'staff') {
          links.push({ href: `/${locale}/orders/${order.id}/confirmation`, label: viewerRole === 'buyer' ? 'Order confirmation' : 'Confirmation' });
        }
        return links.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-border-subtle pt-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-polar-night"
              >
                <Download className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        ) : null;
      })()}
    </div>
  );
}
