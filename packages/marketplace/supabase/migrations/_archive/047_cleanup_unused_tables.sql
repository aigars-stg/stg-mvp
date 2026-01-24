-- Migration: Cleanup unused tables and columns
-- Description: Drops legacy tables and zombie columns from user_profiles
-- Created at: 2025-12-09
-- Modified: Removed welcome_dismissed_at (dropped in 045) from view definition

-- 1. Drop confirmed zombie tables
DROP TABLE IF EXISTS seller_onboarding;
DROP TABLE IF EXISTS old_shipping_rates;
DROP TABLE IF EXISTS wishlist_games;

-- 2. Drop zombie columns from user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS stripe_connect_account_id,
DROP COLUMN IF EXISTS stripe_connect_onboarding_completed,
DROP COLUMN IF EXISTS stripe_connect_charges_enabled,
DROP COLUMN IF EXISTS stripe_connect_payouts_enabled,
DROP COLUMN IF EXISTS stripe_connect_details_submitted,
DROP COLUMN IF EXISTS stripe_connect_updated_at,
DROP COLUMN IF EXISTS seller_status,
DROP COLUMN IF EXISTS dac7_annual_transaction_count,
DROP COLUMN IF EXISTS dac7_annual_sales_total,
DROP COLUMN IF EXISTS dac7_reporting_year,
DROP COLUMN IF EXISTS dac7_tax_id,
DROP COLUMN IF EXISTS dac7_tax_id_type,
DROP COLUMN IF EXISTS has_bank_account,
DROP COLUMN IF EXISTS bank_account_last4,
DROP COLUMN IF EXISTS bank_account_bank_name,
DROP COLUMN IF EXISTS stripe_requirements,
DROP COLUMN IF EXISTS stripe_capabilities;

-- 3. Recreate user_profiles_full view safely
-- DROP VIEW FIRST explicitly to ensure we can recreate it with new schema
DROP VIEW IF EXISTS user_profiles_full;

CREATE OR REPLACE VIEW user_profiles_full AS
SELECT
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
  
  -- Retain 044 columns (minus welcome_dismissed_at which was dropped in 045)
  u.profile_banner_dismissed_until,
  u.onboarding_email_step,
  u.last_onboarding_email_at,

  -- Seller fields sourced from seller_profiles
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

COMMENT ON VIEW user_profiles_full IS 'Backward-compatible view combining user_profiles with seller_profiles.';
