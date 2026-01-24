-- Migration: Schedule hourly refresh of pricing stats materialized view
-- Purpose: Keep stats_game_pricing view updated with latest listing and sales data
-- Date: 2024-12-21

-- ============================================================================
-- SCHEDULE: Refresh pricing stats hourly
-- Runs at 5 minutes past each hour to avoid overlap with other jobs
-- All times are in UTC
-- ============================================================================

SELECT cron.schedule(
  'refresh-game-pricing-stats',
  '5 * * * *',
  $$SELECT refresh_game_pricing_stats()$$
);

-- ============================================================================
-- Set search_path for security on the refresh function
-- ============================================================================

ALTER FUNCTION refresh_game_pricing_stats() SET search_path = public, extensions;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================
-- View scheduled jobs: SELECT * FROM cron.job WHERE jobname = 'refresh-game-pricing-stats';
-- Manual refresh: SELECT refresh_game_pricing_stats();
-- View stats: SELECT * FROM stats_game_pricing WHERE active_listing_count > 0 LIMIT 10;
