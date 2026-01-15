-- Migration: Add source_wanted_listing_id to listings table
-- Purpose: Track which listings were created in response to wanted listings
-- This enables:
--   1. Notification trigger: Identify which buyer to notify when listing is created
--   2. Analytics: Track matching rate (wanted listings → successful listings)
--   3. Conversion tracking: Measure wanted listings → sales conversion
--   4. Game page display: Show "Created in response to a request" badge on listing
--   5. Auto-fulfill: Optionally mark wanted listing as fulfilled when linked listing sells

-- Add the source_wanted_listing_id column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source_wanted_listing_id UUID
  REFERENCES wanted_listings(id) ON DELETE SET NULL;

-- Create partial index for efficient queries on listings with source wanted listing
CREATE INDEX IF NOT EXISTS idx_listings_source_wanted
  ON listings(source_wanted_listing_id)
  WHERE source_wanted_listing_id IS NOT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN listings.source_wanted_listing_id IS 'Reference to wanted listing that prompted this listing creation. Used for buyer notifications and analytics.';
