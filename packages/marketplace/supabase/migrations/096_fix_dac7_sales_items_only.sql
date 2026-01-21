-- Migration: Fix DAC7 sales to count items_total only (not shipping)
-- Description: DAC7 should only report seller revenue (game prices).
--              Shipping goes to platform via Unisend, not to sellers.

-- ============================================================================
-- STEP 1: Update the trigger function to use items_total only
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seller_dac7_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_current_year INTEGER;
  v_order_total DECIMAL(10,2);
BEGIN
  -- Track when order moves to delivered OR completed status (whichever comes first)
  IF (NEW.status = 'delivered' OR NEW.status = 'completed')
     AND (OLD.status IS NULL OR (OLD.status != 'delivered' AND OLD.status != 'completed')) THEN
    -- Use updated_at as proxy for completion timestamp
    v_current_year := EXTRACT(YEAR FROM NEW.updated_at);
    -- Only count items_total (seller revenue), NOT shipping (platform revenue)
    v_order_total := NEW.items_total;

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

COMMENT ON FUNCTION update_seller_dac7_metrics IS 'Auto-update DAC7 metrics when orders are delivered/completed. Only counts items_total (seller revenue), not shipping.';

-- ============================================================================
-- STEP 2: Re-backfill DAC7 metrics with correct calculation
-- ============================================================================

-- First, reset all DAC7 metrics to recalculate fresh
UPDATE seller_profiles SET
  dac7_annual_transaction_count = 0,
  dac7_annual_sales_total = 0,
  dac7_reporting_year = EXTRACT(YEAR FROM NOW())::INTEGER
WHERE dac7_annual_transaction_count > 0 OR dac7_annual_sales_total > 0;

-- Calculate metrics per seller for the current year (items_total ONLY, not shipping)
WITH seller_metrics AS (
  SELECT
    o.seller_id,
    EXTRACT(YEAR FROM o.updated_at)::INTEGER AS reporting_year,
    COUNT(*) AS transaction_count,
    SUM(o.items_total) AS sales_total  -- Only items, not shipping
  FROM orders o
  WHERE o.status IN ('delivered', 'completed')
    AND EXTRACT(YEAR FROM o.updated_at) = EXTRACT(YEAR FROM NOW())
  GROUP BY o.seller_id, EXTRACT(YEAR FROM o.updated_at)
)
UPDATE seller_profiles sp
SET
  dac7_annual_transaction_count = sm.transaction_count,
  dac7_annual_sales_total = sm.sales_total,
  dac7_reporting_year = sm.reporting_year,
  updated_at = NOW()
FROM seller_metrics sm
WHERE sp.user_id = sm.seller_id;

-- ============================================================================
-- STEP 3: Force compliance status recalculation
-- ============================================================================

UPDATE seller_profiles
SET updated_at = NOW()
WHERE dac7_annual_transaction_count > 0 OR dac7_annual_sales_total > 0;

-- ============================================================================
-- STEP 4: Log the backfill results
-- ============================================================================

DO $$
DECLARE
  v_seller_count INTEGER;
  v_total_transactions INTEGER;
  v_total_sales DECIMAL;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(dac7_annual_transaction_count), 0),
    COALESCE(SUM(dac7_annual_sales_total), 0)
  INTO v_seller_count, v_total_transactions, v_total_sales
  FROM seller_profiles
  WHERE dac7_annual_transaction_count > 0 OR dac7_annual_sales_total > 0;

  RAISE NOTICE 'DAC7 backfill complete (items_total only): % sellers, % transactions, €% in sales',
    v_seller_count, v_total_transactions, v_total_sales;
END $$;
