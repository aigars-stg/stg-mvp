-- Migration: Create seller_profiles table
-- Description: Separates seller-specific data from user_profiles for better performance and separation of concerns
-- This table contains Stripe Connect, DAC7 tax reporting, and seller status information

-- ============================================================================
-- STEP 1: Create seller_profiles table
-- ============================================================================

CREATE TABLE seller_profiles (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Seller status
  seller_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (seller_status IN ('not_started', 'onboarding', 'active', 'suspended')),
  seller_terms_accepted_at TIMESTAMPTZ,
  seller_terms_version TEXT DEFAULT '1.0',

  -- Stripe Connect
  stripe_connect_account_id TEXT,
  stripe_connect_onboarding_completed BOOLEAN DEFAULT false,
  stripe_connect_charges_enabled BOOLEAN DEFAULT false,
  stripe_connect_payouts_enabled BOOLEAN DEFAULT false,
  stripe_connect_details_submitted BOOLEAN DEFAULT false,
  stripe_connect_updated_at TIMESTAMPTZ,
  stripe_requirements JSONB DEFAULT '{}',
  stripe_capabilities JSONB DEFAULT '{}',

  -- DAC7 Tax Reporting (EU platform reporting requirements)
  dac7_annual_transaction_count INTEGER DEFAULT 0,
  dac7_annual_sales_total DECIMAL(10,2) DEFAULT 0.00,
  dac7_reporting_year INTEGER,
  dac7_tax_id TEXT,
  dac7_tax_id_type TEXT,

  -- Banking
  has_bank_account BOOLEAN DEFAULT false,
  bank_account_last4 TEXT,
  bank_account_bank_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

-- Index for filtering by seller status (e.g., finding active sellers)
CREATE INDEX idx_seller_profiles_status ON seller_profiles(seller_status);

-- Index for Stripe account lookups (used by webhooks)
CREATE INDEX idx_seller_profiles_stripe_account ON seller_profiles(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- Index for DAC7 reporting queries
CREATE INDEX idx_seller_profiles_dac7_year ON seller_profiles(dac7_reporting_year)
  WHERE dac7_reporting_year IS NOT NULL;

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own seller profile
CREATE POLICY "Users can view their own seller profile"
  ON seller_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own seller profile
CREATE POLICY "Users can update their own seller profile"
  ON seller_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own seller profile (becoming a seller)
CREATE POLICY "Users can insert their own seller profile"
  ON seller_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Public can read basic seller info (for viewing listings and seller pages)
CREATE POLICY "Public can read seller profiles"
  ON seller_profiles FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- STEP 4: Add updated_at trigger
-- ============================================================================

CREATE TRIGGER update_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Comments for documentation
-- ============================================================================

COMMENT ON TABLE seller_profiles IS 'Seller-specific data separated from user_profiles. Contains Stripe Connect, DAC7 tax reporting, and seller status.';
COMMENT ON COLUMN seller_profiles.seller_status IS 'Seller onboarding status: not_started, onboarding, active, suspended';
COMMENT ON COLUMN seller_profiles.dac7_annual_transaction_count IS 'Number of transactions this year for DAC7 threshold (30+)';
COMMENT ON COLUMN seller_profiles.dac7_annual_sales_total IS 'Total sales amount this year for DAC7 threshold (€2000+)';
COMMENT ON COLUMN seller_profiles.stripe_requirements IS 'Pending Stripe requirements (JSON from Stripe API)';
COMMENT ON COLUMN seller_profiles.stripe_capabilities IS 'Enabled Stripe capabilities (JSON from Stripe API)';
