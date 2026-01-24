-- Fix foreign key relationships for conversations and messages tables
-- Change from auth.users.id to user_profiles.id (single source of truth)

-- ============================================================================
-- FIX CONVERSATIONS TABLE
-- ============================================================================

-- Drop existing foreign key constraints
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_buyer_id_fkey;

ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_seller_id_fkey;

-- Add new foreign key constraints to user_profiles
ALTER TABLE conversations
ADD CONSTRAINT conversations_buyer_id_fkey
  FOREIGN KEY (buyer_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

ALTER TABLE conversations
ADD CONSTRAINT conversations_seller_id_fkey
  FOREIGN KEY (seller_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add comments explaining the relationships
COMMENT ON CONSTRAINT conversations_buyer_id_fkey ON conversations IS
  'Links conversation to buyer profile. user_profiles is the single source of truth for user data.';

COMMENT ON CONSTRAINT conversations_seller_id_fkey ON conversations IS
  'Links conversation to seller profile. user_profiles is the single source of truth for user data.';

-- ============================================================================
-- FIX MESSAGES TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Add new foreign key constraint to user_profiles
ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT messages_sender_id_fkey ON messages IS
  'Links message to sender profile. user_profiles is the single source of truth for user data.';

-- ============================================================================
-- FIX BLOCKED_USERS TABLE
-- ============================================================================

-- Drop existing foreign key constraints
ALTER TABLE blocked_users
DROP CONSTRAINT IF EXISTS blocked_users_blocker_id_fkey;

ALTER TABLE blocked_users
DROP CONSTRAINT IF EXISTS blocked_users_blocked_id_fkey;

-- Add new foreign key constraints to user_profiles
ALTER TABLE blocked_users
ADD CONSTRAINT blocked_users_blocker_id_fkey
  FOREIGN KEY (blocker_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

ALTER TABLE blocked_users
ADD CONSTRAINT blocked_users_blocked_id_fkey
  FOREIGN KEY (blocked_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add comments explaining the relationships
COMMENT ON CONSTRAINT blocked_users_blocker_id_fkey ON blocked_users IS
  'Links to user who blocked. user_profiles is the single source of truth for user data.';

COMMENT ON CONSTRAINT blocked_users_blocked_id_fkey ON blocked_users IS
  'Links to user who was blocked. user_profiles is the single source of truth for user data.';
