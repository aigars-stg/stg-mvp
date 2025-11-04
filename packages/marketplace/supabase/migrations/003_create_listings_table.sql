-- Create listings table
-- This table stores game listings from sellers, supporting both BGG API data and manual input

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game Reference
  bgg_game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  game_name TEXT NOT NULL,
  game_year INTEGER,

  -- Version/Language/Publisher Data
  -- Works for both BGG-sourced and manually-entered data
  version_source TEXT NOT NULL CHECK (version_source IN ('bgg', 'manual')),
  bgg_version_id INTEGER, -- NULL for manual entries
  version_name TEXT, -- e.g., "2023 Retail Edition" or BGG version name
  publisher TEXT,
  language TEXT,
  edition_year INTEGER,

  -- Photos (user-uploaded to Supabase Storage)
  photo_urls TEXT[] NOT NULL DEFAULT '{}', -- Array of photo URLs
  main_photo_url TEXT, -- URL of the main/cover photo

  -- Condition Information
  condition TEXT NOT NULL CHECK (condition IN ('likeNew', 'veryGood', 'good', 'acceptable')),
  condition_notes TEXT,
  all_components_present BOOLEAN DEFAULT true,
  missing_components TEXT,

  -- Pricing
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  accept_offers BOOLEAN DEFAULT false,
  minimum_offer DECIMAL(10,2) CHECK (minimum_offer IS NULL OR minimum_offer > 0),

  -- Shipping Options
  shipping_standard BOOLEAN DEFAULT false,
  shipping_express BOOLEAN DEFAULT false,
  shipping_local_pickup BOOLEAN DEFAULT false,
  pickup_city TEXT,
  shipping_notes TEXT,

  -- Additional Information
  why_selling TEXT,

  -- Seller & Status
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'removed')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT photo_urls_not_empty CHECK (array_length(photo_urls, 1) > 0),
  CONSTRAINT minimum_offer_less_than_price CHECK (minimum_offer IS NULL OR minimum_offer < price)
);

-- Indexes for performance
CREATE INDEX idx_listings_game ON listings(bgg_game_id);
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_status ON listings(status) WHERE status = 'active';
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view active listings
CREATE POLICY "Public read access for active listings"
  ON listings
  FOR SELECT
  USING (status = 'active');

-- Sellers can view their own listings (any status)
CREATE POLICY "Sellers can view their own listings"
  ON listings
  FOR SELECT
  USING (auth.uid() = seller_id);

-- Authenticated users can create listings
CREATE POLICY "Authenticated users can create listings"
  ON listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id AND
    status IN ('draft', 'active')
  );

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their own listings"
  ON listings
  FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete their own listings"
  ON listings
  FOR DELETE
  USING (auth.uid() = seller_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- Comments for documentation
COMMENT ON TABLE listings IS 'Game listings from sellers, supporting both BGG API and manual data entry';
COMMENT ON COLUMN listings.version_source IS 'Source of version data: bgg (from BGG API) or manual (user input)';
COMMENT ON COLUMN listings.bgg_version_id IS 'BGG version ID if version_source is bgg, NULL for manual entries';
COMMENT ON COLUMN listings.photo_urls IS 'Array of user-uploaded photo URLs from Supabase Storage';
COMMENT ON COLUMN listings.main_photo_url IS 'URL of the main/cover photo (typically first photo)';
