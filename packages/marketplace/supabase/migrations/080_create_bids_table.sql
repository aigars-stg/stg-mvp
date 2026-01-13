-- Migration: Create bids table for auction bid tracking
-- Description: Stores all bids for auction listings with history and validation
--
-- Note: Seller self-bidding prevention is handled in the place_bid() function,
-- not as a CHECK constraint (PostgreSQL CHECK constraints can't reference other tables)

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bid details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  is_winning BOOLEAN DEFAULT false,

  -- Anti-snipe tracking
  triggered_extension BOOLEAN DEFAULT false,
  extension_minutes INTEGER CHECK (extension_minutes IS NULL OR extension_minutes BETWEEN 2 AND 5),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_bids_listing ON bids(listing_id, created_at DESC);
CREATE INDEX idx_bids_bidder ON bids(bidder_id, created_at DESC);
CREATE INDEX idx_bids_winning ON bids(listing_id) WHERE is_winning = true;
CREATE INDEX idx_bids_amount ON bids(listing_id, amount DESC);

-- Enable Row Level Security
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view bids on active auctions (bid history is public)
CREATE POLICY "Public can view bids on active auctions"
  ON bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = bids.listing_id
        AND listing_type = 'auction'
        AND status = 'active'
    )
  );

-- Bidders can view their own bids on any auction (any status)
CREATE POLICY "Bidders can view their own bids"
  ON bids FOR SELECT
  USING (bidder_id = auth.uid());

-- Sellers can view bids on their auctions
CREATE POLICY "Sellers can view bids on their auctions"
  ON bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = bids.listing_id
        AND seller_id = auth.uid()
    )
  );

-- Authenticated users can place bids (validation happens in place_bid() function)
CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (bidder_id = auth.uid());

-- Comments for documentation
COMMENT ON TABLE bids IS 'Bid history for auction listings';
COMMENT ON COLUMN bids.amount IS 'Bid amount in EUR';
COMMENT ON COLUMN bids.is_winning IS 'True if this is currently the highest bid';
COMMENT ON COLUMN bids.triggered_extension IS 'True if this bid triggered anti-snipe extension';
COMMENT ON COLUMN bids.extension_minutes IS 'Minutes added due to anti-snipe (2-5 minutes)';
COMMENT ON COLUMN bids.ip_address IS 'IP address of bidder for audit purposes';
COMMENT ON COLUMN bids.user_agent IS 'User agent string for audit purposes';
