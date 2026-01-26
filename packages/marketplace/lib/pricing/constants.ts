/**
 * Marketplace pricing constants
 * Centralized location for all fee and pricing configuration
 * All amounts are VAT-inclusive (Latvia 21% VAT)
 */

// ==============================================
// SHIPPING
// ==============================================

/**
 * Flat-rate shipping for Latvia preview period
 * VAT-inclusive (21% VAT)
 * TODO: When expanding to LT/EE, consider route-based pricing
 */
export const SHIPPING_COST_CENTS = 200; // €2.00 flat rate
export const SHIPPING_COST_EUROS = 2.0;

// ==============================================
// SERVICE FEE
// ==============================================

/**
 * Platform service fee: 6% + €0.50 fixed
 * VAT-inclusive (21% VAT)
 * Covers: payment processing, platform operations, buyer protection
 */
export const SERVICE_FEE_PERCENTAGE = 0.06; // 6%
export const SERVICE_FEE_FIXED_CENTS = 50; // €0.50
export const SERVICE_FEE_FIXED_EUROS = 0.5;

// ==============================================
// PAYOUT
// ==============================================

/**
 * Minimum payout amount for bank transfers
 * Prevents uneconomical small payouts
 */
export const MINIMUM_PAYOUT_CENTS = 500; // €5.00
export const MINIMUM_PAYOUT_EUROS = 5.0;

// ==============================================
// DISPUTE WINDOW
// ==============================================

/**
 * Days after delivery that buyer can dispute
 * After this window, order auto-completes and seller is paid
 */
export const DISPUTE_WINDOW_DAYS = 2;

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Calculate service fee for a given item total
 * @param itemsTotalCents - Item price in cents
 * @returns Service fee in cents
 */
export function calculateServiceFeeCents(itemsTotalCents: number): number {
  const percentageFee = Math.round(itemsTotalCents * SERVICE_FEE_PERCENTAGE);
  return percentageFee + SERVICE_FEE_FIXED_CENTS;
}

/**
 * Calculate total charge for buyer
 * @param itemsTotalCents - Item price in cents
 * @param includeShipping - Whether to include shipping (T2T vs local pickup)
 * @returns Object with all pricing components in cents
 */
export function calculateTotalCharge(
  itemsTotalCents: number,
  includeShipping: boolean = true
): {
  itemsTotalCents: number;
  shippingCostCents: number;
  serviceFeeCents: number;
  totalChargeCents: number;
} {
  const shippingCostCents = includeShipping ? SHIPPING_COST_CENTS : 0;
  const serviceFeeCents = calculateServiceFeeCents(itemsTotalCents);
  const totalChargeCents = itemsTotalCents + shippingCostCents + serviceFeeCents;

  return {
    itemsTotalCents,
    shippingCostCents,
    serviceFeeCents,
    totalChargeCents,
  };
}
