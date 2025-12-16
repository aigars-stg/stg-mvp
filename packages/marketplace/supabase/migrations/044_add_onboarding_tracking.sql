-- Migration: Add onboarding tracking fields
-- Purpose: Track welcome modal dismissal and profile completion prompts for progressive onboarding

-- Add welcome modal tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS welcome_dismissed_at TIMESTAMP WITH TIME ZONE;

-- Add profile banner dismissal tracking (dismisses for 7 days)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_banner_dismissed_until TIMESTAMP WITH TIME ZONE;

-- Add email sequence tracking (for onboarding emails)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_email_step INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_onboarding_email_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of users who need onboarding emails
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_email
ON user_profiles (onboarding_email_step, last_onboarding_email_at)
WHERE deleted_at IS NULL;

-- Comment on new columns
COMMENT ON COLUMN user_profiles.welcome_dismissed_at IS 'Timestamp when user dismissed the welcome modal';
COMMENT ON COLUMN user_profiles.profile_banner_dismissed_until IS 'Timestamp until which the profile completion banner is hidden';
COMMENT ON COLUMN user_profiles.onboarding_email_step IS 'Current step in onboarding email sequence (0=welcome, 1=engagement, 2=seller_nudge, 3=complete)';
COMMENT ON COLUMN user_profiles.last_onboarding_email_at IS 'Timestamp of last onboarding email sent';
