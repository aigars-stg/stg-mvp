-- Migration: Add listing_type column for dual-listing model
-- Description: Enables two listing types:
--   - instant_buy: Current flow (Stripe + Unisend, full transaction tracking)
--   - contact_seller: Classified ads style (messaging only, no payment processing)
--
-- All existing listings default to 'instant_buy' for backwards compatibility

-- Add listing_type column to listings table
ALTER TABLE listings
ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'instant_buy'
CHECK (listing_type IN ('instant_buy', 'contact_seller'));

-- Index for filtering by listing type
CREATE INDEX idx_listings_type ON listings(listing_type);

-- Composite index for common query patterns
CREATE INDEX idx_listings_status_type ON listings(status, listing_type);

COMMENT ON COLUMN listings.listing_type IS 'Listing type: instant_buy requires Stripe payment; contact_seller is messaging only';
