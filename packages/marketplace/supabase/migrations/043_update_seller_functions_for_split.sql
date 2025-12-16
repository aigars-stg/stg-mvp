-- Migration: Update seller functions to use seller_profiles table
-- Description: Updates RPC functions and triggers to use the new seller_profiles table
-- instead of querying seller data from user_profiles

-- ============================================================================
-- Update seller_onboarding_completed function
-- ============================================================================

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
  FROM seller_profiles
  WHERE user_id = p_seller_id;

  -- Return false if no seller profile exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN (
    v_profile.seller_status = 'active' AND
    v_profile.seller_terms_accepted_at IS NOT NULL AND
    v_profile.stripe_connect_payouts_enabled = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Update seller_requires_dac7_reporting function
-- ============================================================================

CREATE OR REPLACE FUNCTION seller_requires_dac7_reporting(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT
    dac7_annual_transaction_count,
    dac7_annual_sales_total
  INTO v_profile
  FROM seller_profiles
  WHERE user_id = p_seller_id;

  -- Return false if no seller profile exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Requires reporting if exceeds BOTH thresholds
  RETURN (
    v_profile.dac7_annual_transaction_count >= 30 AND
    v_profile.dac7_annual_sales_total >= 2000
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Update get_seller_onboarding_status function
-- ============================================================================

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
    COALESCE(sp.seller_status, 'not_started')::VARCHAR(20) as seller_status,
    (sp.seller_terms_accepted_at IS NOT NULL) as terms_accepted,
    (sp.stripe_connect_payouts_enabled = TRUE) as stripe_connected,
    seller_onboarding_completed(p_seller_id) as onboarding_completed,
    seller_onboarding_completed(p_seller_id) as can_list_items,
    seller_requires_dac7_reporting(p_seller_id) as needs_dac7_info
  FROM user_profiles up
  LEFT JOIN seller_profiles sp ON up.id = sp.user_id
  WHERE up.id = p_seller_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Update DAC7 metrics trigger function
-- ============================================================================

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

    -- Update seller_profiles (create if doesn't exist)
    INSERT INTO seller_profiles (user_id, dac7_annual_transaction_count, dac7_annual_sales_total, dac7_reporting_year)
    VALUES (NEW.seller_id, 1, v_order_total, v_current_year)
    ON CONFLICT (user_id) DO UPDATE SET
      dac7_annual_transaction_count = CASE
        WHEN seller_profiles.dac7_reporting_year = v_current_year THEN seller_profiles.dac7_annual_transaction_count + 1
        ELSE 1 -- Reset for new year
      END,
      dac7_annual_sales_total = CASE
        WHEN seller_profiles.dac7_reporting_year = v_current_year THEN seller_profiles.dac7_annual_sales_total + v_order_total
        ELSE v_order_total -- Reset for new year
      END,
      dac7_reporting_year = v_current_year,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION seller_onboarding_completed IS 'Check if seller has completed full onboarding (terms + Stripe Connect). Now uses seller_profiles table.';
COMMENT ON FUNCTION seller_requires_dac7_reporting IS 'Check if seller exceeds DAC7 reporting thresholds (30 txns AND 2000 EUR). Now uses seller_profiles table.';
COMMENT ON FUNCTION get_seller_onboarding_status IS 'Get comprehensive seller onboarding status and permissions. Now uses seller_profiles table.';
COMMENT ON FUNCTION update_seller_dac7_metrics IS 'Auto-update DAC7 metrics when orders complete. Now uses seller_profiles table.';
