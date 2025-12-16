-- Migration: Migrate existing seller data from user_profiles to seller_profiles
-- Description: Copies seller-related data from user_profiles to the new seller_profiles table
-- NOTE: This migration should run AFTER 039_create_seller_profiles.sql

-- ============================================================================
-- Migrate existing sellers from user_profiles to seller_profiles
-- ============================================================================

INSERT INTO seller_profiles (
  user_id,
  seller_status,
  seller_terms_accepted_at,
  seller_terms_version,
  stripe_connect_account_id,
  stripe_connect_onboarding_completed,
  stripe_connect_charges_enabled,
  stripe_connect_payouts_enabled,
  stripe_connect_details_submitted,
  stripe_connect_updated_at,
  stripe_requirements,
  stripe_capabilities,
  dac7_annual_transaction_count,
  dac7_annual_sales_total,
  dac7_reporting_year,
  dac7_tax_id,
  dac7_tax_id_type,
  has_bank_account,
  bank_account_last4,
  bank_account_bank_name,
  created_at
)
SELECT
  id,
  COALESCE(seller_status, 'not_started'),
  seller_terms_accepted_at,
  COALESCE(seller_terms_version, '1.0'),
  stripe_connect_account_id,
  COALESCE(stripe_connect_onboarding_completed, false),
  COALESCE(stripe_connect_charges_enabled, false),
  COALESCE(stripe_connect_payouts_enabled, false),
  COALESCE(stripe_connect_details_submitted, false),
  stripe_connect_updated_at,
  COALESCE(stripe_requirements, '{}'),
  COALESCE(stripe_capabilities, '{}'),
  COALESCE(dac7_annual_transaction_count, 0),
  COALESCE(dac7_annual_sales_total, 0.00),
  dac7_reporting_year,
  dac7_tax_id,
  dac7_tax_id_type,
  COALESCE(has_bank_account, false),
  bank_account_last4,
  bank_account_bank_name,
  created_at
FROM user_profiles
WHERE
  -- Only migrate users who have started the seller process
  seller_status IS NOT NULL
  OR stripe_connect_account_id IS NOT NULL
  OR seller_terms_accepted_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING; -- Safety: don't duplicate if run twice
