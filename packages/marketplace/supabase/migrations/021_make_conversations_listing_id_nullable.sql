-- Make conversations.listing_id nullable to support wanted listings
-- For wanted listings, the listing_id will be null and the wanted_listing_id
-- will be tracked in the wanted_listing_responses table

-- Make listing_id nullable
ALTER TABLE conversations
ALTER COLUMN listing_id DROP NOT NULL;

-- Update the unique constraint to handle null listing_id
-- Drop the old constraint
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS unique_conversation;

-- Add new constraint that handles both regular listings and wanted listings
-- For regular listings: listing_id is set, for wanted listings: listing_id is null
ALTER TABLE conversations
ADD CONSTRAINT unique_conversation
  UNIQUE NULLS NOT DISTINCT (listing_id, buyer_id, seller_id);

-- Add comment explaining the schema
COMMENT ON COLUMN conversations.listing_id IS
  'For regular listings: references listings.id. For wanted listings: NULL (wanted_listing_id tracked in wanted_listing_responses table).';
