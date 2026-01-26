'use client';

import { useTranslations } from 'next-intl';
import {
  SHIPPING_COST_EUROS,
  SERVICE_FEE_PERCENTAGE,
  SERVICE_FEE_FIXED_EUROS,
} from '@/lib/pricing/constants';

interface CartBasketSummaryProps {
  itemCount: number;
  subtotal: number;
  /** Override shipping cost (default: €2.00) */
  shippingCost?: number;
  /** Override service fee calculation */
  serviceFee?: number;
}

/**
 * Calculate service fee: 6% + €0.50 fixed
 */
function calculateServiceFee(subtotal: number): number {
  return subtotal * SERVICE_FEE_PERCENTAGE + SERVICE_FEE_FIXED_EUROS;
}

export function CartBasketSummary({
  itemCount,
  subtotal,
  shippingCost = SHIPPING_COST_EUROS,
  serviceFee,
}: CartBasketSummaryProps) {
  const t = useTranslations('Cart');

  const calculatedServiceFee = serviceFee ?? calculateServiceFee(subtotal);
  const total = subtotal + shippingCost + calculatedServiceFee;

  return (
    <div className="space-y-2 text-sm">
      {/* Subtotal */}
      <div className="flex justify-between">
        <span className="text-text-secondary">
          {t('basket.subtotalItems', { count: itemCount })}
        </span>
        <span className="font-medium text-polar-night">
          €{subtotal.toFixed(2)}
        </span>
      </div>

      {/* Shipping */}
      <div className="flex justify-between">
        <span className="text-text-secondary">
          {t('basket.shipping')}
        </span>
        <span className="font-medium text-polar-night">
          €{shippingCost.toFixed(2)}
        </span>
      </div>

      {/* Service Fee */}
      <div className="flex justify-between">
        <span className="text-text-secondary">
          {t('basket.serviceFee')}
        </span>
        <span className="font-medium text-polar-night">
          €{calculatedServiceFee.toFixed(2)}
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
          €{total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
