-- Fix foreign key relationship for wanted_listings.buyer_id
-- Change from auth.users.id to user_profiles.id (single source of truth)
-- This matches how listings.seller_id was fixed in migration 007

-- Drop the existing foreign key constraint
ALTER TABLE wanted_listings
DROP CONSTRAINT IF EXISTS wanted_listings_buyer_id_fkey;

-- Add new foreign key constraint to user_profiles
ALTER TABLE wanted_listings
ADD CONSTRAINT wanted_listings_buyer_id_fkey
  FOREIGN KEY (buyer_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT wanted_listings_buyer_id_fkey ON wanted_listings IS
  'Links wanted listing to buyer profile. user_profiles is the single source of truth for user data.';
