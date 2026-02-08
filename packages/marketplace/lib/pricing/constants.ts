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
// SELLER COMMISSION
// ==============================================

/**
 * Platform commission rate deducted from seller earnings
 * 10% flat rate on item price (not shipping)
 * VAT-inclusive (21% VAT)
 */
export const SELLER_COMMISSION_RATE = 0.10; // 10%

// ==============================================
// DISPUTE WINDOW
// ==============================================

/**
 * Days after delivery that buyer can dispute
 * After this window, order auto-completes and seller wallet is credited
 */
export const DISPUTE_WINDOW_DAYS = 2;
