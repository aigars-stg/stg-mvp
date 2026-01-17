'use client';

import { useMemo } from 'react';
import { calculateMarketplacePricing } from '@/lib/stripe-utils';
import { getShippingPrice, type TerminalCountry } from '@/lib/unisend/types';
import type { TransactionMethod, PricingFormat, ListingType } from '@/lib/types/listing';

/**
 * Result from delivered pricing calculation
 */
export interface DeliveredPricingResult {
  /** Item/listing price in EUR */
  itemPrice: number;
  /** Shipping cost in EUR */
  shippingCost: number;
  /** Platform service fee in EUR */
  serviceFee: number;
  /** Total delivered price (item + shipping + fee) in EUR */
  totalDelivered: number;
  /** Whether pricing could be calculated (false for contact_seller or non-Baltic) */
  canCalculate: boolean;
  /** Whether this is an estimate (buyer country unknown) */
  isEstimate: boolean;
  /** Destination country for the estimate */
  destinationCountry?: TerminalCountry;
}

interface UseDeliveredPricingParams {
  /** Legacy listing type (for backwards compatibility) */
  listingType?: ListingType;
  /** New model: transaction method */
  transactionMethod?: TransactionMethod;
  /** New model: pricing format */
  pricingFormat?: PricingFormat;
  price: number;
  sellerCountry: string | null | undefined;
  buyerCountry?: TerminalCountry;
}

const VALID_COUNTRIES = ['LT', 'LV', 'EE'];

/**
 * Hook to calculate delivered pricing for a listing
 * Returns pricing breakdown including shipping and service fees
 *
 * @example
 * ```tsx
 * const pricing = useDeliveredPricing({
 *   listingType: 'instant_buy',
 *   price: 38.50,
 *   sellerCountry: 'LV',
 *   buyerCountry: 'LV', // optional
 * });
 *
 * if (pricing.canCalculate) {
 *   console.log(pricing.totalDelivered); // 43.21
 * }
 * ```
 */
export function useDeliveredPricing({
  listingType,
  transactionMethod,
  pricingFormat,
  price,
  sellerCountry,
  buyerCountry,
}: UseDeliveredPricingParams): DeliveredPricingResult {
  return useMemo(() => {
    // Determine if we can calculate pricing based on new or old model
    // New model: Check transaction_method and pricing_format
    // Old model: Check listing_type

    // Contact seller listings don't have platform pricing (payment arranged via messages)
    const isContactSeller = transactionMethod
      ? transactionMethod === 'contact_seller'
      : listingType === 'contact_seller';

    // Auction listings can't show delivered price (final bid unknown until auction ends)
    const isAuction = pricingFormat
      ? pricingFormat === 'auction'
      : listingType === 'auction';

    // Can't calculate delivered price for contact seller or auctions
    if (isContactSeller || isAuction) {
      return {
        itemPrice: price,
        shippingCost: 0,
        serviceFee: 0,
        totalDelivered: price,
        canCalculate: false,
        isEstimate: false,
      };
    }

    // If seller has no country or is outside Baltic region, can't calculate
    if (!sellerCountry || !VALID_COUNTRIES.includes(sellerCountry)) {
      return {
        itemPrice: price,
        shippingCost: 0,
        serviceFee: 0,
        totalDelivered: price,
        canCalculate: false,
        isEstimate: false,
      };
    }

    const typedSellerCountry = sellerCountry as TerminalCountry;
    // If buyer country is known, calculate exact price
    // Otherwise, use same-country estimate (typically cheapest route)
    const destinationCountry = buyerCountry || typedSellerCountry;
    const isEstimate = !buyerCountry;

    const shippingCost = getShippingPrice(typedSellerCountry, destinationCountry, 'M');
    const pricing = calculateMarketplacePricing(price, shippingCost, 't2t');

    return {
      itemPrice: price,
      shippingCost,
      serviceFee: pricing.serviceFeeCents / 100,
      totalDelivered: pricing.totalChargeCents / 100,
      canCalculate: true,
      isEstimate,
      destinationCountry,
    };
  }, [listingType, transactionMethod, pricingFormat, price, sellerCountry, buyerCountry]);
}
