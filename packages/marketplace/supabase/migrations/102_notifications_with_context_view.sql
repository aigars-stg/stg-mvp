-- Migration: Notifications With Context View
-- Purpose: Extract commonly-used JSONB fields as typed columns for easier querying
-- Created: 2026-01-24

-- ============================================================================
-- VIEW: notifications_with_context
-- Notifications with JSONB data fields extracted as typed columns
-- ============================================================================

-- DESIGN DECISION: JSONB extraction only, NO joins
-- Rationale:
-- 1. game_name is already stored in the JSONB data field at creation time
-- 2. Listing/actor joins would be slow without functional indexes
-- 3. If live data needed later, add proper indexed columns to base table

CREATE VIEW notifications_with_context AS
SELECT
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.body,
  n.read_at,
  n.created_at,
  -- Extract commonly-needed fields from JSONB with proper types
  (n.data->>'listing_id')::UUID as listing_id,
  (n.data->>'actor_id')::UUID as actor_id,
  (n.data->>'game_name')::TEXT as game_name,
  (n.data->>'bid_amount')::NUMERIC as bid_amount,
  (n.data->>'auction_ends_at')::TIMESTAMPTZ as auction_ends_at,
  (n.data->>'previous_bid')::NUMERIC as previous_bid,
  (n.data->>'order_id')::UUID as order_id,
  -- Keep full JSONB for any additional/future fields
  n.data as raw_data
FROM notifications n;

-- RLS: View inherits RLS from base 'notifications' table
-- Users see only their own notifications (user_id = auth.uid())

COMMENT ON VIEW notifications_with_context IS
  'Notifications with commonly-used JSONB fields extracted as typed columns.

   DESIGN: No joins for performance - game_name etc. are stored in data JSONB at creation time.
   If live data needed, consider adding indexed columns to base table instead of joins.

   EXTRACTED FIELDS:
   - listing_id (UUID) - Related listing
   - actor_id (UUID) - User who triggered notification
   - game_name (TEXT) - Game name (stored at notification creation)
   - bid_amount (NUMERIC) - Bid amount for auction notifications
   - auction_ends_at (TIMESTAMPTZ) - Auction end time
   - previous_bid (NUMERIC) - Previous bid for outbid notifications
   - order_id (UUID) - Related order
   - raw_data (JSONB) - Full original data for any other fields

   RLS: Inherits from notifications table - users see only their own notifications.';

-- ============================================================================
-- OPTIONAL: Functional index for listing_id filtering
-- Only add if filtering by listing_id becomes a common query pattern
-- ============================================================================

-- Uncomment if needed:
-- CREATE INDEX idx_notifications_listing_id
-- ON notifications (((data->>'listing_id')::UUID))
-- WHERE data->>'listing_id' IS NOT NULL;
