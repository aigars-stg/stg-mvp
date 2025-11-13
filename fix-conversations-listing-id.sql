-- Make conversations.listing_id nullable to support wanted listings
-- Run this in your Supabase SQL Editor

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

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name = 'listing_id';
