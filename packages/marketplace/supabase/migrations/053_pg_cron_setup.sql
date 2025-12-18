-- Migration: Setup pg_cron scheduled jobs for pure SQL operations
-- Purpose: Schedule database maintenance tasks that don't require external API calls
-- Date: 2024-12-18

-- ============================================================================
-- FUNCTION: complete_delivered_orders
-- Purpose: Auto-complete orders that have been in 'delivered' status for 3+ days
-- This gives buyers time to report issues before payment is released to sellers
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_delivered_orders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE orders
  SET
    status = 'completed',
    updated_at = NOW()
  WHERE status = 'delivered'
    AND updated_at < NOW() - INTERVAL '3 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log result (visible in cron.job_run_details)
  RAISE NOTICE 'Completed % delivered orders after 3-day inspection period', v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search_path for security
ALTER FUNCTION complete_delivered_orders() SET search_path = public, extensions;

COMMENT ON FUNCTION complete_delivered_orders IS
  'Cron job: Auto-completes delivered orders after 3-day buyer inspection period';

-- ============================================================================
-- SCHEDULE: Pure SQL cron jobs
-- These jobs call existing database functions directly
-- All times are in UTC
-- ============================================================================

-- Job 1: Expire cart reservations (every minute)
-- Releases listings held in carts for more than 30 minutes
SELECT cron.schedule(
  'expire-reservations',
  '* * * * *',
  $$SELECT cleanup_expired_cart_items()$$
);

-- Job 2: Expire wanted listings (daily at 3:00 AM UTC)
-- Marks ISO/wanted listings as expired after 30 days
SELECT cron.schedule(
  'expire-wanted-listings',
  '0 3 * * *',
  $$SELECT expire_wanted_listings()$$
);

-- Job 3: Complete delivered orders (daily at 1:00 AM UTC)
-- Auto-completes orders 3 days after delivery
SELECT cron.schedule(
  'complete-delivered-orders',
  '0 1 * * *',
  $$SELECT complete_delivered_orders()$$
);

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================
-- View scheduled jobs: SELECT * FROM cron.job;
-- View job history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- Unschedule a job: SELECT cron.unschedule('job-name');
