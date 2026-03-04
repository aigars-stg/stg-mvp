'use client';

import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';

interface CartBasketSummaryProps {
  itemCount: number;
  subtotal: number;
}

export function CartBasketSummary({
  itemCount,
  subtotal,
}: CartBasketSummaryProps) {
  const t = useTranslations('Cart');

  return (
    <div className="space-y-2 text-sm">
      {/* Subtotal */}
      <div className="flex justify-between">
        <span className="text-text-secondary">
          {t('basket.subtotalItems', { count: itemCount })}
        </span>
        <span className="font-medium text-polar-night">
          {formatPrice(subtotal)}
        </span>
      </div>

      {/* Shipping */}
      <div className="flex justify-between">
        <span className="text-text-secondary">
          {t('basket.shipping')}
        </span>
        <span className="text-text-secondary text-sm">
          {t('basket.shippingAtCheckout')}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-border-subtle my-2" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="font-semibold text-polar-night">
          {t('basket.total')}
        </span>
        <span className="text-xl font-bold text-polar-night">
          {formatPrice(subtotal)}
        </span>
      </div>
    </div>
  );
}
