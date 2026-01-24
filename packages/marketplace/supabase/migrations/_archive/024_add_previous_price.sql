-- Add previous_price column for price drop tracking
-- This allows us to show "Price Reduced" badges to buyers

-- Add previous_price column (nullable, as new listings won't have a previous price)
ALTER TABLE listings
ADD COLUMN previous_price NUMERIC(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN listings.previous_price IS 'Previous price before last price reduction (for showing price drop indicators)';
