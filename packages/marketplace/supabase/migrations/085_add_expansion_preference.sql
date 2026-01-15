-- Migration: Add expansion_preference to wanted_listings table
-- Purpose: Allow buyers to specify whether they want base game only or are open to expansions
--
-- V1 Options:
--   'base_only' (default) - I just want the base game
--   'expansions_welcome' - I'm open to bundles with expansions
--
-- V2 (future): Could add 'with_specific' for specific expansion requests

-- Add the expansion_preference column with CHECK constraint
ALTER TABLE wanted_listings ADD COLUMN IF NOT EXISTS expansion_preference TEXT DEFAULT 'base_only'
  CHECK (expansion_preference IN ('base_only', 'expansions_welcome'));

-- Add comment explaining the column purpose
COMMENT ON COLUMN wanted_listings.expansion_preference IS 'Whether buyer wants base game only or is open to expansion bundles';

-- Index for filtering by expansion preference (useful for matching sellers)
CREATE INDEX IF NOT EXISTS idx_wanted_listings_expansion_preference
  ON wanted_listings(expansion_preference)
  WHERE status = 'active';
