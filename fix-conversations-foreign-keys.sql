-- Fix foreign key relationships for conversations, messages, and blocked_users tables
-- Run this in your Supabase SQL editor to fix the "Failed to create conversation" error

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

-- Verify the changes
SELECT
  'conversations' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'conversations'::regclass
  AND contype = 'f';

SELECT
  'messages' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
  AND contype = 'f';

SELECT
  'blocked_users' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'blocked_users'::regclass
  AND contype = 'f';
