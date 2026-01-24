-- Migration: Remove welcome_dismissed_at column
-- Reason: WelcomeModal was removed - signup email now serves as the only welcome touchpoint

-- Drop the unused column
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS welcome_dismissed_at;

-- Drop the comment (will be removed with column, but being explicit)
