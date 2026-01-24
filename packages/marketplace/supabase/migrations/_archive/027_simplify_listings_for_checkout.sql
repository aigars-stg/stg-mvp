-- Simplify listings table for checkout flow
-- Removes unused fields and adds reservation support for cart system

-- ============================================
-- STEP 1: Remove unused columns
-- ============================================

-- Remove offer/negotiation fields (fixed price only for now)
ALTER TABLE listings DROP COLUMN IF EXISTS accept_offers;
ALTER TABLE listings DROP COLUMN IF EXISTS minimum_offer;

-- Remove currency (EUR only)
ALTER TABLE listings DROP COLUMN IF EXISTS currency;

-- Remove generic shipping options (only T2T and local pickup supported)
ALTER TABLE listings DROP COLUMN IF EXISTS shipping_standard;
ALTER TABLE listings DROP COLUMN IF EXISTS shipping_express;

-- ============================================
-- STEP 2: Add reservation support
-- ============================================

-- Add reservation columns for cart system
-- A listing is reserved when reserved_until > NOW()
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reserved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP WITH TIME ZONE;

-- Create index for efficient reservation queries
CREATE INDEX IF NOT EXISTS idx_listings_reserved_until
  ON listings(reserved_until)
  WHERE reserved_until IS NOT NULL;

-- ============================================
-- STEP 3: Add seller country for shipping price calculation
-- ============================================

-- Seller's country is stored in user_profiles, but we cache it here
-- for efficient shipping price lookups
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_country VARCHAR(2);

-- ============================================
-- STEP 4: Update constraints
-- ============================================

-- Drop old constraint that referenced minimum_offer
ALTER TABLE listings DROP CONSTRAINT IF EXISTS minimum_offer_less_than_price;

-- ============================================
-- STEP 5: Create helper function for reservation checks
-- ============================================

-- Function to check if a listing is available for purchase
CREATE OR REPLACE FUNCTION is_listing_available(listing_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  listing_record RECORD;
BEGIN
  SELECT status, reserved_until
  INTO listing_record
  FROM listings
  WHERE id = listing_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Available if: status is active AND (not reserved OR reservation expired)
  RETURN listing_record.status = 'active'
    AND (listing_record.reserved_until IS NULL OR listing_record.reserved_until < NOW());
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to reserve a listing for a buyer
CREATE OR REPLACE FUNCTION reserve_listing(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_duration_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Attempt to reserve the listing atomically
  UPDATE listings
  SET
    reserved_by = p_buyer_id,
    reserved_until = NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    updated_at = NOW()
  WHERE
    id = p_listing_id
    AND status = 'active'
    AND (reserved_until IS NULL OR reserved_until < NOW())
    AND seller_id != p_buyer_id; -- Prevent buying own listing

  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to release a reservation
CREATE OR REPLACE FUNCTION release_listing_reservation(
  p_listing_id UUID,
  p_buyer_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN;
BEGIN
  UPDATE listings
  SET
    reserved_by = NULL,
    reserved_until = NULL,
    updated_at = NOW()
  WHERE
    id = p_listing_id
    AND reserved_by = p_buyer_id;

  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to release all expired reservations (called by cron)
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE listings
  SET
    reserved_by = NULL,
    reserved_until = NULL,
    updated_at = NOW()
  WHERE
    reserved_until IS NOT NULL
    AND reserved_until < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Update RLS policies for reservations
-- ============================================

-- Update public read policy to exclude reserved listings (optional - discuss)
-- For now, we keep showing reserved listings but mark them as unavailable in UI
-- This allows buyers to see what's popular/in-demand

-- Add policy for buyers to see their reserved listings
CREATE POLICY "Buyers can view their reserved listings"
  ON listings
  FOR SELECT
  USING (auth.uid() = reserved_by);

-- ============================================
-- STEP 7: Add comments
-- ============================================

COMMENT ON COLUMN listings.reserved_by IS 'UUID of buyer who has this listing in their cart';
COMMENT ON COLUMN listings.reserved_until IS 'Timestamp when reservation expires (30 minutes from cart add)';
COMMENT ON COLUMN listings.seller_country IS 'Cached seller country code (LT/LV/EE) for shipping calculations';
COMMENT ON FUNCTION is_listing_available IS 'Check if listing is available for purchase (active and not reserved)';
COMMENT ON FUNCTION reserve_listing IS 'Reserve a listing for a buyer with 30-minute timeout';
COMMENT ON FUNCTION release_listing_reservation IS 'Release a specific buyer reservation';
COMMENT ON FUNCTION release_expired_reservations IS 'Release all expired reservations (cron job)';
