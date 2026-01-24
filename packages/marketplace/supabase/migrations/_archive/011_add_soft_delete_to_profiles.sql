-- Add soft delete support to user profiles
-- GDPR compliance: retain data for 90 days for dispute resolution and legal claims defense

-- Add deleted_at column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deletion_reason column to track why account was deleted (user request, admin action, etc.)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

-- Add recovery_deadline column for 14-day grace period
-- Users can recover their account within this timeframe
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS recovery_deadline TIMESTAMPTZ DEFAULT NULL;

-- Add original_email column to store email for recovery
-- Email in auth.users will be anonymized, but we need original for recovery
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS original_email TEXT DEFAULT NULL;

-- Add index for efficient queries on active users
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NULL;

-- Add index for recovery queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_recovery ON user_profiles(recovery_deadline) WHERE recovery_deadline IS NOT NULL;

-- Update RLS policies to exclude soft-deleted users from public queries

-- Drop existing public read policy and recreate with soft-delete awareness
DROP POLICY IF EXISTS "Public can read seller profiles" ON user_profiles;

-- Public can read seller profiles (excluding soft-deleted)
CREATE POLICY "Public can read seller profiles"
ON user_profiles
FOR SELECT
TO public
USING (deleted_at IS NULL);

-- Update the authenticated users policy as well
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;

-- Users can read their own profile (even if soft-deleted, for data download)
CREATE POLICY "Users can read their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Note: Keep update and insert policies as-is, they already restrict to own profile

-- Comment explaining the soft delete strategy
COMMENT ON COLUMN user_profiles.deleted_at IS
'Soft delete timestamp for GDPR compliance. Data retained for 90 days after deletion request for dispute resolution and legal claims defense per GDPR Article 17.3.e. Permanent deletion occurs after retention period via scheduled cleanup job.';

COMMENT ON COLUMN user_profiles.deletion_reason IS
'Reason for account deletion: user_request, admin_action, gdpr_request, fraud, etc. Used for audit trail and compliance.';

COMMENT ON COLUMN user_profiles.recovery_deadline IS
'Timestamp until which the account can be recovered (14 days from deletion). After this deadline, recovery is no longer possible. Email in auth.users is anonymized immediately, but account can be restored within grace period.';

COMMENT ON COLUMN user_profiles.original_email IS
'Original email address stored for account recovery purposes. Set when account is deleted. Used to restore email if user recovers account within 14-day grace period. Cleared after permanent deletion.';
