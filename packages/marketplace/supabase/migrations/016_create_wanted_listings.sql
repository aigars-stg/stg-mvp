-- Migration: Create wanted listings (ISO) system
-- Description: Allows buyers to post "In Search Of" listings for games they want to purchase

-- ============================================================================
-- TABLE: wanted_listings
-- ============================================================================

CREATE TABLE wanted_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game Reference (same structure as listings table)
  bgg_game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  game_name TEXT NOT NULL,
  game_year INTEGER,

  -- Budget Information
  min_price DECIMAL(10,2) CHECK (min_price IS NULL OR min_price > 0),
  max_price DECIMAL(10,2) NOT NULL CHECK (max_price > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Preferences
  acceptable_conditions TEXT[] NOT NULL DEFAULT ARRAY['likeNew', 'veryGood', 'good', 'acceptable'],
  preferred_language TEXT,
  location_preferences TEXT, -- e.g., "Latvia, Estonia" or "Local pickup only"
  notes TEXT, -- Additional details, trade willingness, urgency, etc.

  -- Buyer & Status
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'fulfilled', 'cancelled')),

  -- Response Tracking
  response_count INTEGER NOT NULL DEFAULT 0 CHECK (response_count >= 0 AND response_count <= 10),

  -- Expiration Management
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT min_less_than_max CHECK (min_price IS NULL OR min_price < max_price),
  CONSTRAINT valid_conditions CHECK (
    acceptable_conditions <@ ARRAY['likeNew', 'veryGood', 'good', 'acceptable']
    AND array_length(acceptable_conditions, 1) > 0
  )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core indexes for common queries
CREATE INDEX idx_wanted_listings_game ON wanted_listings(bgg_game_id);
CREATE INDEX idx_wanted_listings_buyer ON wanted_listings(buyer_id);
CREATE INDEX idx_wanted_listings_status ON wanted_listings(status) WHERE status = 'active';
CREATE INDEX idx_wanted_listings_created_at ON wanted_listings(created_at DESC);
CREATE INDEX idx_wanted_listings_expires_at ON wanted_listings(expires_at) WHERE status = 'active';

-- Composite index for seller discovery (active ISOs sorted by newest)
CREATE INDEX idx_wanted_active_recent ON wanted_listings(status, created_at DESC) WHERE status = 'active';

-- Composite index for expiration job (find expiring ISOs)
CREATE INDEX idx_wanted_expiring ON wanted_listings(expires_at, status) WHERE status = 'active';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at on every update
CREATE TRIGGER update_wanted_listings_updated_at
  BEFORE UPDATE ON wanted_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Auto-expire listings past their expiration date
-- This will be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION expire_wanted_listings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE wanted_listings
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE wanted_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active wanted listings
CREATE POLICY "Public read access for active wanted listings"
  ON wanted_listings
  FOR SELECT
  USING (status = 'active');

-- Buyers can view their own wanted listings (any status)
CREATE POLICY "Buyers can view their own wanted listings"
  ON wanted_listings
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Authenticated users can create wanted listings
CREATE POLICY "Authenticated users can create wanted listings"
  ON wanted_listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND status IN ('active')
    AND expires_at > NOW()
  );

-- Buyers can update their own wanted listings
CREATE POLICY "Buyers can update their own wanted listings"
  ON wanted_listings
  FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can delete their own wanted listings
CREATE POLICY "Buyers can delete their own wanted listings"
  ON wanted_listings
  FOR DELETE
  USING (auth.uid() = buyer_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE wanted_listings IS 'ISO (In Search Of) listings where buyers post games they want to purchase';
COMMENT ON COLUMN wanted_listings.acceptable_conditions IS 'Array of condition values buyer will accept (likeNew, veryGood, good, acceptable)';
COMMENT ON COLUMN wanted_listings.location_preferences IS 'Geographic preferences for seller location or shipping';
COMMENT ON COLUMN wanted_listings.response_count IS 'Number of seller responses (max 10)';
COMMENT ON COLUMN wanted_listings.expires_at IS 'Automatic expiration date (30 days from creation, extendable)';
COMMENT ON COLUMN wanted_listings.status IS 'active: accepting responses | expired: past expiration | fulfilled: buyer found game | cancelled: buyer cancelled';
