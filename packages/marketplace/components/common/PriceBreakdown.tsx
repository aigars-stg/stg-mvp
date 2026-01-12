'use client';

import { useTranslations } from 'next-intl';
import { getCountryName } from '@/lib/country-utils';
import type { DeliveredPricingResult } from '@/lib/hooks/useDeliveredPricing';

interface PriceBreakdownProps {
  pricing: DeliveredPricingResult;
  variant: 'full' | 'compact';
}

/**
 * Displays price breakdown for delivered pricing
 *
 * @param pricing - The pricing result from useDeliveredPricing hook
 * @param variant - 'full' for detailed breakdown (OfferCard), 'compact' for single line (ListingCard)
 *
 * @example
 * ```tsx
 * // Full variant - used in OfferCard
 * <PriceBreakdown pricing={pricing} variant="full" />
 *
 * // Compact variant - used in ListingCard
 * <PriceBreakdown pricing={pricing} variant="compact" />
 * ```
 */
export function PriceBreakdown({ pricing, variant }: PriceBreakdownProps) {
  const t = useTranslations('PriceBreakdown');

  if (!pricing.canCalculate) {
    return null;
  }

  const countryName = pricing.destinationCountry
    ? getCountryName(pricing.destinationCountry)
    : '';

  if (variant === 'compact') {
    // Single line: "€38.50 + €4.71 fees"
    const fees = pricing.shippingCost + pricing.serviceFee;
    return (
      <div className="text-xs text-text-muted">
        <span>€{pricing.itemPrice.toFixed(2)}</span>
        <span className="mx-1">+</span>
        <span>
          €{fees.toFixed(2)} {t('fees')}
        </span>
        {pricing.isEstimate && <span>*</span>}
      </div>
    );
  }

  // Full breakdown
  return (
    <div className="text-xs space-y-0.5 text-right">
      <div className="flex justify-end gap-2">
        <span className="text-text-muted">{t('item')}</span>
        <span className="text-text-secondary">€{pricing.itemPrice.toFixed(2)}</span>
      </div>
      <div className="flex justify-end gap-2">
        <span className="text-text-muted">
          {t('shipping', { country: countryName })}
        </span>
        <span className="text-text-secondary">€{pricing.shippingCost.toFixed(2)}</span>
      </div>
      <div className="flex justify-end gap-2">
        <span className="text-text-muted">{t('serviceFee')}</span>
        <span className="text-text-secondary">€{pricing.serviceFee.toFixed(2)}</span>
      </div>
      {pricing.isEstimate && (
        <p className="text-text-muted italic pt-0.5 text-[10px]">{t('estimateNote')}</p>
      )}
    </div>
  );
}
