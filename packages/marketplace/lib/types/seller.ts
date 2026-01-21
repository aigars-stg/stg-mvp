/**
 * DAC7 compliance status values
 * - exempt: Below 80% of thresholds
 * - approaching: 80-99% of thresholds
 * - required: At/above thresholds, no tax info submitted
 * - compliant: At/above thresholds, tax info submitted
 * - blocked: At/above thresholds, no tax info, selling blocked
 */
export type Dac7ComplianceStatus =
  | 'exempt'
  | 'approaching'
  | 'required'
  | 'compliant'
  | 'blocked';

/**
 * DAC7 tax information submitted by seller
 */
export interface Dac7TaxInfo {
  fullLegalName: string;
  dateOfBirth: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  addressCountry: string;
  taxResidencyCountry: string;
  taxId: string;
  taxIdType: string;
}

/**
 * Seller profile data stored in the seller_profiles table
 * This is separate from the core user_profiles table for:
 * - Better performance (only ~20% of users are sellers)
 * - Cleaner separation of concerns
 * - Easier DAC7 compliance reporting
 */
export interface SellerProfile {
  user_id: string;

  // Seller status
  seller_status: 'not_started' | 'onboarding' | 'active' | 'suspended';
  seller_terms_accepted_at: string | null;
  seller_terms_version: string;

  // Trust & Reputation
  total_reviews: number;
  average_rating: number;
  positive_rating_percent: number;
  total_completed_sales: number;
  member_since: string | null;

  // Stripe Connect
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_completed: boolean;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_details_submitted: boolean;
  stripe_connect_updated_at: string | null;
  stripe_requirements: Record<string, unknown>;
  stripe_capabilities: Record<string, unknown>;

  // DAC7 Tax Reporting (EU platform reporting requirements)
  dac7_annual_transaction_count: number;
  dac7_annual_sales_total: number;
  dac7_reporting_year: number | null;
  dac7_tax_id: string | null;
  dac7_tax_id_type: string | null;

  // DAC7 Tax Information (collected when approaching thresholds)
  dac7_full_legal_name: string | null;
  dac7_date_of_birth: string | null;
  dac7_address_street: string | null;
  dac7_address_city: string | null;
  dac7_address_postal_code: string | null;
  dac7_address_country: string | null;
  dac7_tax_residency_country: string | null;
  dac7_info_submitted_at: string | null;
  dac7_info_verified: boolean;
  dac7_compliance_status: Dac7ComplianceStatus;

  // Banking
  has_bank_account: boolean;
  bank_account_last4: string | null;
  bank_account_bank_name: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Seller status type for use in components
 */
export type SellerStatus = SellerProfile['seller_status'];

/**
 * Check if a seller can receive payments
 */
export function canReceivePayments(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  return (
    seller.seller_status === 'active' &&
    seller.stripe_connect_charges_enabled &&
    seller.stripe_connect_payouts_enabled
  );
}

/**
 * Check if a seller has completed onboarding
 */
export function isSellerOnboarded(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  return seller.seller_status === 'active' && seller.stripe_connect_onboarding_completed;
}

/**
 * Check if seller is approaching DAC7 reporting threshold
 * EU requires reporting when: 30+ transactions OR €2000+ in sales
 */
export function isApproachingDac7Threshold(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  const transactionWarning = seller.dac7_annual_transaction_count >= 25;
  const salesWarning = seller.dac7_annual_sales_total >= 1800;
  return transactionWarning || salesWarning;
}

/**
 * Check if seller has exceeded DAC7 reporting threshold
 */
export function hasExceededDac7Threshold(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  return seller.dac7_annual_transaction_count >= 30 || seller.dac7_annual_sales_total >= 2000;
}

// ============================================================================
// Trust & Reviews Types
// ============================================================================

/**
 * Seller badge tier based on sales and rating
 */
export type SellerBadgeTier = 'new_seller' | 'trusted_seller' | 'top_seller';

/**
 * Seller review submitted by a buyer
 */
export interface SellerReview {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_text: string | null;
  seller_response: string | null;
  seller_responded_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Review with buyer information (from seller_reviews_with_buyer view)
 */
export interface SellerReviewWithBuyer extends SellerReview {
  buyer_name: string | null;
  buyer_avatar: string | null;
  buyer_country: string | null;
  order_number: string;
  game_name: string | null;
}

/**
 * Seller trust summary returned by get_seller_trust_summary function
 */
export interface SellerTrustSummary {
  seller_id: string;
  total_reviews: number;
  average_rating: number;
  positive_rating_percent: number;
  total_completed_sales: number;
  member_since: string | null;
  seller_status: SellerStatus;
  badge_tier: SellerBadgeTier;
}

/**
 * Compact trust info for display on listing cards
 */
export interface SellerTrustInfo {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
  sellerCountry: string | null;
  totalSales: number;
  averageRating: number;
  totalReviews: number;
  badgeTier: SellerBadgeTier;
  memberSince: string | null;
}

/**
 * Determine seller badge tier based on sales and rating
 */
export function getSellerBadgeTier(
  totalSales: number,
  averageRating: number
): SellerBadgeTier {
  if (totalSales >= 25 && averageRating >= 4.8) {
    return 'top_seller';
  }
  if (totalSales >= 5 && averageRating >= 4.5) {
    return 'trusted_seller';
  }
  return 'new_seller';
}

/**
 * Get human-readable badge label
 */
export function getBadgeLabel(tier: SellerBadgeTier): string {
  switch (tier) {
    case 'top_seller':
      return 'Top Seller';
    case 'trusted_seller':
      return 'Trusted Seller';
    case 'new_seller':
      return 'New Seller';
  }
}

/**
 * Format member since date as relative time (e.g., "Member since 2023")
 */
export function formatMemberSince(memberSince: string | null): string {
  if (!memberSince) return '';
  const year = new Date(memberSince).getFullYear();
  return `Member since ${year}`;
}

// ============================================================================
// DAC7 Compliance Helpers
// ============================================================================

/**
 * DAC7 threshold constants
 */
export const DAC7_THRESHOLDS = {
  TRANSACTION_COUNT: 30,
  SALES_TOTAL: 2000,
  WARNING_TRANSACTION_COUNT: 24, // 80% of 30
  WARNING_SALES_TOTAL: 1600, // 80% of 2000
} as const;

/**
 * Check if seller needs to provide DAC7 tax information
 */
export function needsDac7TaxInfo(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  return (
    seller.dac7_compliance_status === 'approaching' ||
    seller.dac7_compliance_status === 'required' ||
    seller.dac7_compliance_status === 'blocked'
  );
}

/**
 * Check if seller is blocked from creating new listings due to DAC7
 */
export function isBlockedByDac7(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  return seller.dac7_compliance_status === 'blocked';
}

/**
 * Check if seller has submitted DAC7 tax information
 */
export function hasDac7TaxInfo(seller: SellerProfile | null): boolean {
  if (!seller) return false;
  return seller.dac7_info_submitted_at !== null;
}

/**
 * Get DAC7 threshold progress as percentages
 */
export function getDac7Progress(seller: SellerProfile | null): {
  transactionPercent: number;
  salesPercent: number;
} {
  if (!seller) {
    return { transactionPercent: 0, salesPercent: 0 };
  }
  return {
    transactionPercent: Math.min(
      100,
      (seller.dac7_annual_transaction_count / DAC7_THRESHOLDS.TRANSACTION_COUNT) * 100
    ),
    salesPercent: Math.min(
      100,
      (seller.dac7_annual_sales_total / DAC7_THRESHOLDS.SALES_TOTAL) * 100
    ),
  };
}

/**
 * Get human-readable DAC7 compliance status label
 */
export function getDac7StatusLabel(status: Dac7ComplianceStatus): string {
  switch (status) {
    case 'exempt':
      return 'Not required';
    case 'approaching':
      return 'Action needed soon';
    case 'required':
      return 'Tax info required';
    case 'compliant':
      return 'Compliant';
    case 'blocked':
      return 'Selling blocked';
  }
}
