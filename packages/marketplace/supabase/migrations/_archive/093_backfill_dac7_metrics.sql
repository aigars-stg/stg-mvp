-- Migration: Backfill DAC7 metrics from existing completed orders
-- Description: Recalculates dac7_annual_transaction_count and dac7_annual_sales_total
--              for all sellers based on completed orders in the current year.
--              This is needed because orders completed before the trigger was set up
--              (or before migration 092) were not tracked.

-- ============================================================================
-- STEP 1: Backfill DAC7 metrics from completed orders
-- ============================================================================

-- Note: Using updated_at as proxy for completion date since completed_at
-- column doesn't exist. This is the timestamp when order moved to completed status.

-- Calculate metrics per seller for the current year
WITH seller_metrics AS (
  SELECT
    o.seller_id,
    EXTRACT(YEAR FROM o.updated_at)::INTEGER AS reporting_year,
    COUNT(*) AS transaction_count,
    SUM(o.items_total + o.shipping_cost) AS sales_total
  FROM orders o
  WHERE o.status = 'completed'
    AND EXTRACT(YEAR FROM o.updated_at) = EXTRACT(YEAR FROM NOW())
  GROUP BY o.seller_id, EXTRACT(YEAR FROM o.updated_at)
)
UPDATE seller_profiles sp
SET
  dac7_annual_transaction_count = COALESCE(sm.transaction_count, 0),
  dac7_annual_sales_total = COALESCE(sm.sales_total, 0),
  dac7_reporting_year = COALESCE(sm.reporting_year, EXTRACT(YEAR FROM NOW())::INTEGER),
  updated_at = NOW()
FROM seller_metrics sm
WHERE sp.user_id = sm.seller_id;

-- ============================================================================
-- STEP 2: Ensure compliance status is recalculated
-- ============================================================================

-- The trigger on seller_profiles will automatically update dac7_compliance_status
-- when we touch these fields, but we need to trigger it explicitly for sellers
-- that already had correct counts but weren't updated since the trigger was added.

-- Force trigger execution by touching the records
UPDATE seller_profiles
SET updated_at = NOW()
WHERE dac7_annual_transaction_count > 0 OR dac7_annual_sales_total > 0;

-- ============================================================================
-- STEP 3: Log the backfill results
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

  RAISE NOTICE 'DAC7 backfill complete: % sellers, % transactions, €% in sales',
    v_seller_count, v_total_transactions, v_total_sales;
END $$;
