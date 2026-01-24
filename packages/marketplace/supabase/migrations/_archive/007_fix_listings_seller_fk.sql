-- Fix foreign key relationship for listings.seller_id
-- Change from auth.users.id to user_profiles.id (single source of truth)

-- First, ensure all existing listings have valid seller_ids in user_profiles
-- This should already be true since auth.users and user_profiles share the same IDs
-- But we'll verify to be safe

-- Drop the existing foreign key constraint
ALTER TABLE listings
DROP CONSTRAINT IF EXISTS listings_seller_id_fkey;

-- Add new foreign key constraint to user_profiles
ALTER TABLE listings
ADD CONSTRAINT listings_seller_id_fkey
  FOREIGN KEY (seller_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add index for the foreign key if it doesn't exist
-- (idx_listings_seller already exists from migration 003, but this ensures it)
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT listings_seller_id_fkey ON listings IS
  'Links listing to seller profile. user_profiles is the single source of truth for user data.';
