-- Migration: Add auction listing type and auction-specific fields
-- Description: Enables English ascending auctions as a third listing type
--
-- Auction features:
--   - Visible starting price (no hidden reserve)
--   - Duration options: 1, 3, 5, or 7 days
--   - Anti-snipe protection: extends by 2-5 minutes if bid placed in final 5 minutes
--   - Winner has 48 hours to complete payment
--   - Cancellation blocked once bids exist

-- Step 1: Update listing_type constraint to include 'auction'
-- First drop the existing constraint, then add the new one
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('instant_buy', 'contact_seller', 'auction'));

-- Step 2: Add auction-specific columns to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_start_price DECIMAL(10,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_current_bid DECIMAL(10,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_bid_count INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_duration_days INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_winner_id UUID REFERENCES auth.users(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_winner_notified_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_payment_deadline TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_anti_snipe_extended BOOLEAN DEFAULT false;

-- Step 3: Add constraint ensuring auction fields are set when listing_type = 'auction'
ALTER TABLE listings ADD CONSTRAINT auction_fields_required CHECK (
  listing_type != 'auction' OR (
    auction_start_price IS NOT NULL AND
    auction_start_price > 0 AND
    auction_ends_at IS NOT NULL AND
    auction_duration_days IN (1, 3, 5, 7)
  )
);

-- Step 4: Create indexes for auction queries
CREATE INDEX IF NOT EXISTS idx_listings_auction_ends_at
  ON listings(auction_ends_at)
  WHERE listing_type = 'auction' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_auction_winner
  ON listings(auction_winner_id)
  WHERE auction_winner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_auction_payment_deadline
  ON listings(auction_payment_deadline)
  WHERE auction_payment_deadline IS NOT NULL AND status = 'active';

-- Step 5: Add comments for documentation
COMMENT ON COLUMN listings.auction_start_price IS 'Starting price for auctions (visible to all bidders)';
COMMENT ON COLUMN listings.auction_current_bid IS 'Current highest bid amount (NULL if no bids yet)';
COMMENT ON COLUMN listings.auction_bid_count IS 'Total number of bids placed on this auction';
COMMENT ON COLUMN listings.auction_ends_at IS 'When the auction ends (can be extended by anti-snipe logic)';
COMMENT ON COLUMN listings.auction_duration_days IS 'Original auction duration: 1, 3, 5, or 7 days';
COMMENT ON COLUMN listings.auction_winner_id IS 'User ID of the winning bidder (set when auction ends)';
COMMENT ON COLUMN listings.auction_winner_notified_at IS 'When the winner was notified via email';
COMMENT ON COLUMN listings.auction_payment_deadline IS 'Winner must complete payment by this time (48h from auction end)';
COMMENT ON COLUMN listings.auction_anti_snipe_extended IS 'Whether this auction was extended due to anti-snipe rule';
