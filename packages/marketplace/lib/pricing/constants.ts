/**
 * Marketplace pricing constants
 * Centralized location for all fee and pricing configuration
 * All amounts are VAT-inclusive (Latvia 21% VAT)
 */

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
