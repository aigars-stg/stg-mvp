-- Migration: Restructure listing types to 2-dimensional model
-- Description: Replace compound listing_type with separate transaction_method and pricing_format columns
--
-- This enables 4 combinations:
--   - contact_seller + fixed_price: Buyer contacts seller to arrange payment
--   - contact_seller + auction: Winner contacts seller to arrange payment
--   - instant_buy + fixed_price: Buyer pays via Stripe immediately
--   - instant_buy + auction: Winner pays via Stripe checkout

-- Step 1: Delete existing auction test data (all existing auctions are test data)
DELETE FROM bids WHERE listing_id IN (SELECT id FROM listings WHERE listing_type = 'auction');
DELETE FROM listings WHERE listing_type = 'auction';

-- Step 2: Add new columns with defaults for existing data migration
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS transaction_method TEXT NOT NULL DEFAULT 'contact_seller'
    CHECK (transaction_method IN ('contact_seller', 'instant_buy'));

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS pricing_format TEXT NOT NULL DEFAULT 'fixed_price'
    CHECK (pricing_format IN ('fixed_price', 'auction'));

-- Step 3: Migrate existing data from listing_type to new columns
UPDATE listings
SET transaction_method = 'instant_buy', pricing_format = 'fixed_price'
WHERE listing_type = 'instant_buy';

UPDATE listings
SET transaction_method = 'contact_seller', pricing_format = 'fixed_price'
WHERE listing_type = 'contact_seller';

-- Step 4: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_listings_transaction_method ON listings(transaction_method);
CREATE INDEX IF NOT EXISTS idx_listings_pricing_format ON listings(pricing_format);
CREATE INDEX IF NOT EXISTS idx_listings_transaction_pricing ON listings(transaction_method, pricing_format);

-- Step 5: Update the auction_fields_required constraint to use new pricing_format column
ALTER TABLE listings DROP CONSTRAINT IF EXISTS auction_fields_required;
ALTER TABLE listings ADD CONSTRAINT auction_fields_required CHECK (
  pricing_format != 'auction' OR (
    auction_start_price IS NOT NULL AND
    auction_start_price > 0 AND
    auction_ends_at IS NOT NULL AND
    auction_duration_days IN (1, 3, 5, 7)
  )
);

-- Step 6: Update auction-related indexes to use pricing_format
DROP INDEX IF EXISTS idx_listings_auction_ends_at;
CREATE INDEX idx_listings_auction_ends_at
  ON listings(auction_ends_at)
  WHERE pricing_format = 'auction' AND status = 'active';

-- Step 7: Add comments for documentation
COMMENT ON COLUMN listings.transaction_method IS 'How the transaction is completed: contact_seller (messaging/offline payment) or instant_buy (Stripe payment)';
COMMENT ON COLUMN listings.pricing_format IS 'How price is determined: fixed_price (set by seller) or auction (bidding)';

-- Note: The old listing_type column will be dropped in a separate migration after code deployment
-- to ensure backwards compatibility during the transition
