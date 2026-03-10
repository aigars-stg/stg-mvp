'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Download } from '@/lib/icons';
import { formatPrice, formatCentsToCurrency, calculateSellerEarnings } from '@/lib/services/pricing';
import type { OrderDetailOrder, ViewerRole } from '@/lib/types/order-detail';

interface OrderPricingSummaryProps {
  order: OrderDetailOrder;
  viewerRole: ViewerRole;
  title?: string;
}

export function OrderPricingSummary({
  order,
  viewerRole,
  title,
}: OrderPricingSummaryProps) {
  const locale = useLocale();
  const t = useTranslations('Orders.detail.summary');
  const commissionCents = order.payment?.platform_commission_cents;
  const sellerCreditCents = order.payment?.seller_wallet_credit_cents;
  const isCancelledOrRefunded = ['cancelled', 'refunded'].includes(order.status);

  // Estimated earnings shown before order completion (when actual amounts aren't set yet)
  const { commissionCents: estimatedCommissionCents, walletCreditCents: estimatedEarningsCents } =
    calculateSellerEarnings(Math.round(order.items_total * 100));

  const displayCommission = commissionCents != null
    ? formatCentsToCurrency(commissionCents)
    : isCancelledOrRefunded
      ? formatCentsToCurrency(0)
      : formatCentsToCurrency(estimatedCommissionCents);

  const displayEarnings = sellerCreditCents != null
    ? formatCentsToCurrency(sellerCreditCents)
    : isCancelledOrRefunded
      ? formatCentsToCurrency(0)
      : `~${formatCentsToCurrency(estimatedEarningsCents)}`;

  const earningsLabel = (sellerCreditCents != null || isCancelledOrRefunded)
    ? t('youReceive')
    : t('youReceiveEstimated');

  return (
    <div className="bg-snow-white border border-border rounded-xl p-3 sm:p-4">
      <h3 className="font-semibold text-polar-night mb-4">{title ?? t('title')}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">{t('items')}</span>
          <span className="font-medium text-polar-night">
            {formatPrice(order.items_total)}
          </span>
        </div>
        {viewerRole !== 'seller' && (
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('shipping')}</span>
            <span className="font-medium">
              {order.shipping_cost === 0 ? (
                <span className="text-aurora-green">{t('free')}</span>
              ) : (
                <span className="text-polar-night">
                  {formatPrice(order.shipping_cost)}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Seller view: show commission and net earnings */}
        {viewerRole === 'seller' && (
          <>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('commission')} (10%)</span>
              <span className="font-medium text-aurora-red">
                -{displayCommission}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border-subtle">
              <span className="font-semibold text-polar-night">
                {earningsLabel}
              </span>
              <span className="text-xl font-bold text-aurora-green">
                {displayEarnings}
              </span>
            </div>
          </>
        )}

        {/* Buyer view: just total paid */}
        {viewerRole === 'buyer' && (
          <div className="flex justify-between pt-2 border-t border-border-subtle">
            <span className="font-semibold text-polar-night">{t('totalPaid')}</span>
            <span className="text-lg font-bold text-polar-night">
              {formatPrice(order.total_amount)}
            </span>
          </div>
        )}

        {/* Staff view: total + commission breakdown */}
        {viewerRole === 'staff' && (
          <>
            <div className="flex justify-between font-semibold text-polar-night pt-1">
              <span>{t('total')}</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
            {commissionCents != null && commissionCents > 0 && (
              <div className="flex justify-between text-text-secondary pt-2 border-t border-border-subtle">
                <span>{t('commission')} (10%)</span>
                <span className="text-polar-night">
                  {formatCentsToCurrency(commissionCents)}
                </span>
              </div>
            )}
            {sellerCreditCents != null && sellerCreditCents > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>{t('sellerCredit')}</span>
                <span className="text-aurora-green">
                  {formatCentsToCurrency(sellerCreditCents)}
                </span>
              </div>
            )}
            {order.refund_amount != null && order.refund_amount > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>{t('refund')}</span>
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
            links.push({
              href: `/${locale}/orders/${order.id}/invoice`,
              label: viewerRole === 'seller' ? t('viewInvoice') : t('invoice'),
            });
          }
          if (order.credit_note_number) {
            links.push({
              href: `/${locale}/orders/${order.id}/credit-note`,
              label: viewerRole === 'seller' ? t('viewCreditNote') : t('creditNote'),
            });
          }
        }
        if (viewerRole === 'buyer' || viewerRole === 'staff') {
          links.push({
            href: `/${locale}/orders/${order.id}/confirmation`,
            label: viewerRole === 'buyer' ? t('orderConfirmation') : t('confirmation'),
          });
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
