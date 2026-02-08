/**
 * Pricing service
 * Calculates buyer charges, seller earnings, and checkout pricing
 * All amounts in cents to avoid floating-point issues
 */

import {
  SELLER_COMMISSION_RATE,
} from '@/lib/pricing/constants';

// ==============================================
// TYPES
// ==============================================

export interface BuyerPricing {
  /** Subtotal of all items in cents */
  itemsTotalCents: number;
  /** Shipping cost in cents (0 for local pickup) */
  shippingCostCents: number;
  /** Total buyer pays: items + shipping (no service fee) */
  totalChargeCents: number;
}

export interface SellerEarnings {
  /** Subtotal of all items in cents */
  itemsTotalCents: number;
  /** Platform commission in cents (10% of items) */
  commissionCents: number;
  /** What seller receives in wallet: items - commission */
  walletCreditCents: number;
}

export interface OrderPricing extends BuyerPricing, SellerEarnings {}

export interface CheckoutPricing extends BuyerPricing {
  /** Amount debited from buyer's wallet */
  walletDebitCents: number;
  /** Remainder charged via EveryPay (0 if wallet covers total) */
  everypayChargeCents: number;
}

// ==============================================
// CALCULATIONS
// ==============================================

/**
 * Calculate what the buyer pays
 * Buyer pays: item price + shipping. No service fee.
 * @param itemsTotalCents - total item price in cents
 * @param shippingCostCents - shipping cost in cents (route-based or 0 for pickup)
 */
export function calculateBuyerPricing(
  itemsTotalCents: number,
  shippingCostCents: number
): BuyerPricing {
  return {
    itemsTotalCents,
    shippingCostCents,
    totalChargeCents: itemsTotalCents + shippingCostCents,
  };
}

/**
 * Calculate seller earnings after commission
 * Seller receives: item price - 10% commission
 */
export function calculateSellerEarnings(
  itemsTotalCents: number
): SellerEarnings {
  const commissionCents = Math.round(itemsTotalCents * SELLER_COMMISSION_RATE);
  return {
    itemsTotalCents,
    commissionCents,
    walletCreditCents: itemsTotalCents - commissionCents,
  };
}

/**
 * Calculate full order pricing (buyer + seller sides)
 */
export function calculateOrderPricing(
  itemsTotalCents: number,
  shippingCostCents: number
): OrderPricing {
  const buyer = calculateBuyerPricing(itemsTotalCents, shippingCostCents);
  const seller = calculateSellerEarnings(itemsTotalCents);
  return { ...buyer, ...seller };
}

/**
 * Calculate checkout pricing with wallet balance applied
 * Wallet is used first; EveryPay covers the remainder.
 * If wallet covers the full amount, everypayChargeCents = 0.
 */
export function calculateCheckoutPricing(
  itemsTotalCents: number,
  shippingCostCents: number,
  walletBalanceCents: number
): CheckoutPricing {
  const buyer = calculateBuyerPricing(itemsTotalCents, shippingCostCents);
  const walletDebitCents = Math.min(walletBalanceCents, buyer.totalChargeCents);
  const everypayChargeCents = buyer.totalChargeCents - walletDebitCents;

  return {
    ...buyer,
    walletDebitCents,
    everypayChargeCents,
  };
}

/**
 * Calculate checkout pricing from euro amounts (convenience wrapper)
 * Converts euros to cents before calculating
 */
export function calculateCheckoutPricingFromEuros(
  itemsTotalEuros: number,
  shippingCostEuros: number,
  walletBalanceCents: number
): CheckoutPricing {
  const itemsTotalCents = Math.round(itemsTotalEuros * 100);
  const shippingCostCents = Math.round(shippingCostEuros * 100);
  return calculateCheckoutPricing(itemsTotalCents, shippingCostCents, walletBalanceCents);
}

// ==============================================
// FORMATTING
// ==============================================

/**
 * Format cents to Euro string
 * @example formatCentsToEuros(2550) => "25.50"
 */
export function formatCentsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Format cents to Euro currency string
 * @example formatCentsToCurrency(2550) => "€25.50"
 */
export function formatCentsToCurrency(cents: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
