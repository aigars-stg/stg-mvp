-- Migration: Add Missing FK Indexes & Cleanup Unused Indexes
-- Description: Addresses Performance Advisor INFO suggestions
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

-- ============================================================================
-- PART 1: Add indexes for unindexed foreign keys
-- These improve JOIN performance and CASCADE DELETE operations
-- ============================================================================

-- listings.reserved_by - Used for cart reservations
CREATE INDEX IF NOT EXISTS idx_listings_reserved_by
  ON listings(reserved_by)
  WHERE reserved_by IS NOT NULL;

-- message_read_status.last_read_message_id - Used for read tracking
CREATE INDEX IF NOT EXISTS idx_message_read_status_last_read_message
  ON message_read_status(last_read_message_id)
  WHERE last_read_message_id IS NOT NULL;

-- order_issues.resolved_by - Used for issue resolution tracking
CREATE INDEX IF NOT EXISTS idx_order_issues_resolved_by
  ON order_issues(resolved_by)
  WHERE resolved_by IS NOT NULL;

-- orders.cancelled_by - Used for cancellation tracking
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_by
  ON orders(cancelled_by)
  WHERE cancelled_by IS NOT NULL;

-- ============================================================================
-- PART 2: Drop clearly unused/redundant indexes
-- Being conservative - only dropping indexes that are truly unnecessary
-- Many "unused" indexes may be needed as the app scales or for admin queries
-- ============================================================================

-- Drop duplicate/redundant indexes on games table
-- These filtering indexes aren't used in current queries
DROP INDEX IF EXISTS idx_games_player_count;
DROP INDEX IF EXISTS idx_games_min_age;

-- Drop unused reservation index (we just added a better one above)
DROP INDEX IF EXISTS idx_listings_reserved_until;

-- ============================================================================
-- PART 3: Indexes to KEEP (not dropping despite "unused" warning)
-- ============================================================================

-- KEEP: idx_games_name_lower - Will be used for search as traffic grows
-- KEEP: idx_user_profiles_email - Needed for email lookups
-- KEEP: idx_orders_order_number - Needed for order number lookups
-- KEEP: idx_orders_barcode - Needed for shipping/tracking integration
-- KEEP: idx_orders_status - Will be heavily used as orders grow
-- KEEP: idx_orders_created - Needed for order listing pagination
-- KEEP: idx_listings_game - Needed for game-based filtering
-- KEEP: idx_wanted_listings_* - Will be used as ISO feature grows
-- KEEP: idx_seller_profiles_stripe_account - Needed for webhook processing
-- KEEP: idx_conversations_last_message - Needed for inbox sorting
-- KEEP: idx_messages_created_at - Needed for message pagination

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_listings_reserved_by IS 'Index on reserved_by FK for cart reservation queries';
COMMENT ON INDEX idx_message_read_status_last_read_message IS 'Index on last_read_message_id FK for read status tracking';
COMMENT ON INDEX idx_order_issues_resolved_by IS 'Index on resolved_by FK for issue resolution queries';
COMMENT ON INDEX idx_orders_cancelled_by IS 'Index on cancelled_by FK for cancellation tracking';
