-- Migration: Add auth_providers column to user_profiles
-- Purpose: Store OAuth provider info to avoid expensive Admin API calls in check-email endpoint
-- This is Step 1 of a staged deployment - column is nullable so existing code continues to work

-- Add the auth_providers column as a text array
-- Default to empty array for new rows
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS auth_providers TEXT[] DEFAULT '{}';

-- Add an index for potential future queries on providers
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_providers
ON user_profiles USING GIN (auth_providers);

-- Add a comment explaining the column purpose
COMMENT ON COLUMN user_profiles.auth_providers IS
'Array of OAuth providers used by this user (e.g., google, facebook, email). Populated on sign-in to avoid Admin API calls.';
