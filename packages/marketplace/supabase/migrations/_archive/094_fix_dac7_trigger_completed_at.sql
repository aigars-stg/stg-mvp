-- Migration: Fix DAC7 trigger to use updated_at instead of non-existent completed_at
-- Description: The update_seller_dac7_metrics function references completed_at which
--              doesn't exist on the orders table. This updates it to use updated_at.

-- ============================================================================
-- STEP 1: Update the trigger function to use updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seller_dac7_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_current_year INTEGER;
  v_order_total DECIMAL(10,2);
BEGIN
  -- Only track when order moves to completed status
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Use updated_at as proxy for completion timestamp since completed_at doesn't exist
    v_current_year := EXTRACT(YEAR FROM NEW.updated_at);
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

COMMENT ON FUNCTION update_seller_dac7_metrics IS 'Auto-update DAC7 metrics when orders complete. Uses updated_at as completion timestamp.';
