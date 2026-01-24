-- Remove deprecated columns from listings table
-- These columns were removed during the PricingShipping refactoring

-- Drop accept_offers and minimum_offer columns
ALTER TABLE listings
DROP COLUMN IF EXISTS accept_offers,
DROP COLUMN IF EXISTS minimum_offer;

-- Drop old shipping columns
ALTER TABLE listings
DROP COLUMN IF EXISTS shipping_standard,
DROP COLUMN IF EXISTS shipping_express,
DROP COLUMN IF EXISTS pickup_city;

-- Drop why_selling column
ALTER TABLE listings
DROP COLUMN IF EXISTS why_selling;

-- Add new shipping columns
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS shipping_parcel_locker BOOLEAN DEFAULT false;

-- Note: shipping_local_pickup and shipping_notes already exist in migration 003
-- Just making sure they're present:
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS shipping_local_pickup BOOLEAN DEFAULT false;

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

-- Update comments
COMMENT ON COLUMN listings.shipping_local_pickup IS 'Whether local pickup is available';
COMMENT ON COLUMN listings.shipping_parcel_locker IS 'Whether parcel locker delivery is available';
COMMENT ON COLUMN listings.shipping_notes IS 'Additional shipping information and notes';
