-- Materialized view for internal pricing statistics
-- Aggregates active listing prices and completed sale prices per game
-- Refreshed hourly via pg_cron (see migration 065)

-- ============================================
-- STEP 1: Create materialized view
-- ============================================

CREATE MATERIALIZED VIEW stats_game_pricing AS
SELECT
  g.id AS bgg_game_id,

  -- Active listing statistics
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') AS active_listing_count,
  MIN(l.price) FILTER (WHERE l.status = 'active') AS lowest_active_price,
  AVG(l.price) FILTER (WHERE l.status = 'active') AS avg_active_price,

  -- Completed sales statistics (from order_items via orders)
  COUNT(DISTINCT oi.id) FILTER (WHERE o.status = 'completed') AS completed_sales_count,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY oi.price)
    FILTER (WHERE o.status = 'completed') AS median_sold_price,
  AVG(oi.price) FILTER (WHERE o.status = 'completed') AS avg_sold_price,
  MIN(oi.price) FILTER (WHERE o.status = 'completed') AS min_sold_price,
  MAX(oi.price) FILTER (WHERE o.status = 'completed') AS max_sold_price,

  -- Last refresh timestamp
  NOW() AS refreshed_at

FROM games g
LEFT JOIN listings l ON g.id = l.bgg_game_id
LEFT JOIN order_items oi ON g.id = oi.bgg_game_id
LEFT JOIN orders o ON oi.order_id = o.id
GROUP BY g.id;

-- ============================================
-- STEP 2: Create unique index for CONCURRENTLY refresh
-- ============================================

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_stats_game_pricing_bgg_id ON stats_game_pricing(bgg_game_id);

-- ============================================
-- STEP 3: Create refresh function
-- ============================================

CREATE OR REPLACE FUNCTION refresh_game_pricing_stats()
RETURNS void AS $$
BEGIN
  -- CONCURRENTLY allows reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY stats_game_pricing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Comments
-- ============================================

COMMENT ON MATERIALIZED VIEW stats_game_pricing IS 'Aggregated pricing stats per game - refreshed hourly via pg_cron';
COMMENT ON COLUMN stats_game_pricing.bgg_game_id IS 'BGG game ID (same as games.id)';
COMMENT ON COLUMN stats_game_pricing.active_listing_count IS 'Number of currently active listings for this game';
COMMENT ON COLUMN stats_game_pricing.lowest_active_price IS 'Lowest price among active listings';
COMMENT ON COLUMN stats_game_pricing.median_sold_price IS 'Median (50th percentile) of completed sale prices - robust against outliers';
COMMENT ON COLUMN stats_game_pricing.completed_sales_count IS 'Total number of completed sales for this game';
COMMENT ON FUNCTION refresh_game_pricing_stats IS 'Refreshes stats_game_pricing materialized view - called hourly by pg_cron';
