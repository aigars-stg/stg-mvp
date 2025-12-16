-- Migration: Create backward-compatible view for user_profiles
-- Description: Creates a view that joins user_profiles with seller_profiles for backward compatibility
-- This allows existing code to continue working while we migrate to the new structure

-- ============================================================================
-- Create the combined view
-- ============================================================================

CREATE OR REPLACE VIEW user_profiles_full AS
SELECT
  -- Core user fields
  u.id,
  u.full_name,
  u.email,
  u.phone,
  u.avatar_url,
  u.country,
  u.created_at,
  u.updated_at,
  u.deleted_at,
  u.deletion_reason,
  u.recovery_deadline,
  u.original_email,

  -- Seller fields from seller_profiles (with defaults for non-sellers)
  COALESCE(s.seller_status, 'not_started') as seller_status,
  s.seller_terms_accepted_at,
  COALESCE(s.seller_terms_version, '1.0') as seller_terms_version,
  s.stripe_connect_account_id,
  COALESCE(s.stripe_connect_onboarding_completed, false) as stripe_connect_onboarding_completed,
  COALESCE(s.stripe_connect_charges_enabled, false) as stripe_connect_charges_enabled,
  COALESCE(s.stripe_connect_payouts_enabled, false) as stripe_connect_payouts_enabled,
  COALESCE(s.stripe_connect_details_submitted, false) as stripe_connect_details_submitted,
  s.stripe_connect_updated_at,
  COALESCE(s.stripe_requirements, '{}') as stripe_requirements,
  COALESCE(s.stripe_capabilities, '{}') as stripe_capabilities,
  COALESCE(s.dac7_annual_transaction_count, 0) as dac7_annual_transaction_count,
  COALESCE(s.dac7_annual_sales_total, 0.00) as dac7_annual_sales_total,
  s.dac7_reporting_year,
  s.dac7_tax_id,
  s.dac7_tax_id_type,
  COALESCE(s.has_bank_account, false) as has_bank_account,
  s.bank_account_last4,
  s.bank_account_bank_name

FROM user_profiles u
LEFT JOIN seller_profiles s ON u.id = s.user_id;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON VIEW user_profiles_full IS 'Backward-compatible view combining user_profiles with seller_profiles. Use this during migration period.';
