-- Add seller onboarding tracking fields
-- Ensures sellers complete proper onboarding before listing items

-- ============================================
-- STEP 1: Add seller onboarding fields to user_profiles
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN seller_status VARCHAR(20) DEFAULT 'not_started'
  CHECK (seller_status IN ('not_started', 'onboarding', 'active', 'suspended')),
ADD COLUMN seller_terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN seller_terms_version VARCHAR(10) DEFAULT '1.0';

-- Create index for faster seller status lookups
CREATE INDEX idx_user_profiles_seller_status ON user_profiles(seller_status)
  WHERE seller_status IN ('onboarding', 'active');

-- ============================================
-- STEP 2: Add DAC7 tracking fields
-- ============================================

-- Track annual transaction counts and totals for DAC7 compliance
-- DAC7 requires reporting sellers who exceed BOTH:
-- - 30+ transactions per year
-- - €2,000+ in annual sales

ALTER TABLE user_profiles
ADD COLUMN dac7_annual_transaction_count INTEGER DEFAULT 0,
ADD COLUMN dac7_annual_sales_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN dac7_reporting_year INTEGER,
ADD COLUMN dac7_tax_id VARCHAR(50),
ADD COLUMN dac7_tax_id_type VARCHAR(20); -- VAT, personal_tax_id, etc.

-- ============================================
-- STEP 3: Helper Functions
-- ============================================

-- Check if seller has completed onboarding
CREATE OR REPLACE FUNCTION seller_onboarding_completed(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT
    seller_status,
    seller_terms_accepted_at,
    stripe_connect_payouts_enabled
  INTO v_profile
  FROM user_profiles
  WHERE id = p_seller_id;

  RETURN (
    v_profile.seller_status = 'active' AND
    v_profile.seller_terms_accepted_at IS NOT NULL AND
    v_profile.stripe_connect_payouts_enabled = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if seller needs DAC7 reporting
CREATE OR REPLACE FUNCTION seller_requires_dac7_reporting(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT
    dac7_annual_transaction_count,
    dac7_annual_sales_total
  INTO v_profile
  FROM user_profiles
  WHERE id = p_seller_id;

  -- Requires reporting if exceeds BOTH thresholds
  RETURN (
    v_profile.dac7_annual_transaction_count >= 30 AND
    v_profile.dac7_annual_sales_total >= 2000
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get seller onboarding progress
CREATE OR REPLACE FUNCTION get_seller_onboarding_status(p_seller_id UUID)
RETURNS TABLE (
  seller_status VARCHAR(20),
  terms_accepted BOOLEAN,
  stripe_connected BOOLEAN,
  onboarding_completed BOOLEAN,
  can_list_items BOOLEAN,
  needs_dac7_info BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.seller_status,
    (up.seller_terms_accepted_at IS NOT NULL) as terms_accepted,
    (up.stripe_connect_payouts_enabled = TRUE) as stripe_connected,
    seller_onboarding_completed(p_seller_id) as onboarding_completed,
    seller_onboarding_completed(p_seller_id) as can_list_items,
    seller_requires_dac7_reporting(p_seller_id) as needs_dac7_info
  FROM user_profiles up
  WHERE up.id = p_seller_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STEP 4: Trigger to track DAC7 metrics
-- ============================================

-- Auto-update DAC7 metrics when orders complete
CREATE OR REPLACE FUNCTION update_seller_dac7_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_current_year INTEGER;
  v_order_total DECIMAL(10,2);
BEGIN
  -- Only track when order moves to completed status
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_current_year := EXTRACT(YEAR FROM NEW.completed_at);
    v_order_total := NEW.items_total + NEW.shipping_cost;

    -- Update or reset seller's annual metrics
    UPDATE user_profiles
    SET
      dac7_annual_transaction_count = CASE
        WHEN dac7_reporting_year = v_current_year THEN dac7_annual_transaction_count + 1
        ELSE 1 -- Reset for new year
      END,
      dac7_annual_sales_total = CASE
        WHEN dac7_reporting_year = v_current_year THEN dac7_annual_sales_total + v_order_total
        ELSE v_order_total -- Reset for new year
      END,
      dac7_reporting_year = v_current_year
    WHERE id = NEW.seller_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_dac7_metrics_on_order_completion
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_dac7_metrics();

-- ============================================
-- STEP 5: Comments
-- ============================================

COMMENT ON COLUMN user_profiles.seller_status IS 'Seller onboarding status: not_started, onboarding, active, suspended';
COMMENT ON COLUMN user_profiles.seller_terms_accepted_at IS 'When seller accepted the seller terms of service';
COMMENT ON COLUMN user_profiles.seller_terms_version IS 'Version of seller terms accepted (e.g., 1.0, 1.1)';

COMMENT ON COLUMN user_profiles.dac7_annual_transaction_count IS 'Number of completed transactions this year (DAC7 threshold: 30)';
COMMENT ON COLUMN user_profiles.dac7_annual_sales_total IS 'Total sales amount this year in EUR (DAC7 threshold: €2,000)';
COMMENT ON COLUMN user_profiles.dac7_reporting_year IS 'Year these DAC7 metrics were last calculated for';
COMMENT ON COLUMN user_profiles.dac7_tax_id IS 'Tax identification number for DAC7 reporting';
COMMENT ON COLUMN user_profiles.dac7_tax_id_type IS 'Type of tax ID: VAT, personal_tax_id, etc.';

COMMENT ON FUNCTION seller_onboarding_completed IS 'Check if seller has completed full onboarding (terms + Stripe Connect)';
COMMENT ON FUNCTION seller_requires_dac7_reporting IS 'Check if seller exceeds DAC7 reporting thresholds (30 txns AND €2,000)';
COMMENT ON FUNCTION get_seller_onboarding_status IS 'Get comprehensive seller onboarding status and permissions';
