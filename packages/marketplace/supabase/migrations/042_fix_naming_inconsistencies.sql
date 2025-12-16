-- Migration: Fix naming inconsistencies across tables
-- Description: Standardizes column names for consistency

-- ============================================================================
-- Fix 1: Rename game_bgg_id to bgg_game_id in order_items
-- Reason: listings table uses bgg_game_id, order_items should match
-- ============================================================================

ALTER TABLE order_items RENAME COLUMN game_bgg_id TO bgg_game_id;

-- ============================================================================
-- Fix 2: Remove redundant saved_at column from saved_listings
-- Reason: saved_at and created_at have identical values; use created_at only
-- ============================================================================

ALTER TABLE saved_listings DROP COLUMN IF EXISTS saved_at;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN order_items.bgg_game_id IS 'BGG game ID (renamed from game_bgg_id for consistency with listings table)';
