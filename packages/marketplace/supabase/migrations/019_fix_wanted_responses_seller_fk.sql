-- Fix foreign key relationship for wanted_listing_responses.seller_id
-- Change from auth.users.id to user_profiles.id (single source of truth)

-- Drop the existing foreign key constraint
ALTER TABLE wanted_listing_responses
DROP CONSTRAINT IF EXISTS wanted_listing_responses_seller_id_fkey;

-- Add new foreign key constraint to user_profiles
ALTER TABLE wanted_listing_responses
ADD CONSTRAINT wanted_listing_responses_seller_id_fkey
  FOREIGN KEY (seller_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT wanted_listing_responses_seller_id_fkey ON wanted_listing_responses IS
  'Links response to seller profile. user_profiles is the single source of truth for user data.';
