-- External pricing cache for BoardGamePrices.co.uk API responses
-- Caches for 65 minutes (60 min ToS requirement + 5 min buffer)
-- https://boardgameprices.co.uk/api - requires 1-hour minimum cache

-- ============================================
-- STEP 1: Create external_pricing_cache table
-- ============================================

CREATE TABLE external_pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game reference (games.id is the BGG ID)
  bgg_game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  -- Cache timing
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '65 minutes'),

  -- Full API response for future-proofing
  raw_response JSONB NOT NULL,

  -- Extracted values for quick access
  lowest_price DECIMAL(10,2),           -- Lowest new retail price in EUR
  lowest_price_url TEXT,                -- Attribution redirect URL from BGP
  offer_count INTEGER DEFAULT 0,        -- Number of offers found

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One cache entry per game
  CONSTRAINT unique_bgg_game_cache UNIQUE (bgg_game_id)
);

-- ============================================
-- STEP 2: Create trigger to auto-set expires_at
-- ============================================

CREATE OR REPLACE FUNCTION set_pricing_cache_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.cached_at + INTERVAL '65 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_pricing_cache_expiry
  BEFORE INSERT OR UPDATE ON external_pricing_cache
  FOR EACH ROW
  EXECUTE FUNCTION set_pricing_cache_expiry();

-- ============================================
-- STEP 3: Create indexes
-- ============================================

-- Fast lookup by game
CREATE INDEX idx_external_pricing_bgg_id ON external_pricing_cache(bgg_game_id);

-- Fast expiry checks
CREATE INDEX idx_external_pricing_expires ON external_pricing_cache(expires_at);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE external_pricing_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (pricing data is not sensitive)
CREATE POLICY "External pricing cache is publicly readable"
  ON external_pricing_cache
  FOR SELECT
  USING (true);

-- Only service role can write (Edge Function uses service role)
-- No INSERT/UPDATE/DELETE policies for regular users

-- ============================================
-- STEP 5: Comments
-- ============================================

COMMENT ON TABLE external_pricing_cache IS 'Cached pricing data from BoardGamePrices.co.uk API (65-min TTL per ToS)';
COMMENT ON COLUMN external_pricing_cache.bgg_game_id IS 'References games.id which is the BGG game ID';
COMMENT ON COLUMN external_pricing_cache.expires_at IS 'Auto-set by trigger: cached_at + 65 minutes';
COMMENT ON COLUMN external_pricing_cache.lowest_price IS 'Lowest new retail EUR price from external retailers (excluding shipping)';
COMMENT ON COLUMN external_pricing_cache.lowest_price_url IS 'BGP redirect URL for attribution (must be used per ToS)';
COMMENT ON COLUMN external_pricing_cache.raw_response IS 'Full API response for future schema changes without re-fetching';
