/**
 * Stripe utility functions (client-safe)
 * These functions can be used on both server and client
 */

/**
 * Service fee configuration for the marketplace
 * These can be easily adjusted for business needs
 */
export const SERVICE_FEE_CONFIG = {
  // Terminal-to-Terminal (T2T) shipping
  t2t: {
    percentageFee: 0.06, // 6.0%
    fixedFeeCents: 50, // €0.50 in cents
  },
  // Local pickup
  local_pickup: {
    percentageFee: 0.06, // 6.0%
    fixedFeeCents: 50, // €0.50 in cents
  },
} as const;

/**
 * Marketplace pricing breakdown
 */
export interface MarketplacePricing {
  /** Subtotal of all items (what seller(s) asked for) in cents */
  itemsTotalCents: number;
  /** Shipping cost in cents */
  shippingCostCents: number;
  /** Platform service fee in cents */
  serviceFeeCents: number;
  /** Total amount buyer pays in cents */
  totalChargeCents: number;
  /** What goes back to platform account in cents */
  applicationFeeAmount: number;
}

/**
 * Calculate marketplace pricing with service fees
 *
 * @param itemsTotalEuros - Total price of items (seller's listing prices)
 * @param shippingCostEuros - Shipping cost (0 for local pickup, €2-3 for T2T)
 * @param shippingMethod - Delivery method ('t2t' | 'local_pickup')
 * @returns Pricing breakdown in cents
 *
 * @example
 * ```ts
 * const pricing = calculateMarketplacePricing(25.00, 2.50, 't2t');
 * // Returns: {
 * //   itemsTotalCents: 2500,
 * //   shippingCostCents: 250,
 * //   serviceFeeCents: 138, // 3.5% of €25 + €0.50
 * //   totalChargeCents: 2888,
 * //   applicationFeeAmount: 138
 * // }
 * ```
 */
export function calculateMarketplacePricing(
  itemsTotalEuros: number,
  shippingCostEuros: number,
  shippingMethod: 't2t' | 'local_pickup'
): MarketplacePricing {
  // Convert to cents to avoid floating-point issues
  const itemsTotalCents = Math.round(itemsTotalEuros * 100);
  const shippingCostCents = Math.round(shippingCostEuros * 100);

  // Get fee config for the shipping method
  const feeConfig = SERVICE_FEE_CONFIG[shippingMethod];

  // Calculate service fee: percentage of items + fixed fee
  const percentageFeeCents = Math.round(itemsTotalCents * feeConfig.percentageFee);
  const serviceFeeCents = percentageFeeCents + feeConfig.fixedFeeCents;

  // Total the buyer pays (items + shipping + service fee)
  const totalChargeCents = itemsTotalCents + shippingCostCents + serviceFeeCents;

  return {
    itemsTotalCents,
    shippingCostCents,
    serviceFeeCents,
    totalChargeCents,
    applicationFeeAmount: serviceFeeCents, // This comes back to platform
  };
}

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
