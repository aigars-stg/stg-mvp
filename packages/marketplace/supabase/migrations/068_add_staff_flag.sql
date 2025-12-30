-- Add staff flag to user_profiles for admin access
-- Staff users can view all transactions, issues, and messages for support purposes

-- ============================================
-- Add is_staff column
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for staff lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_staff ON user_profiles(is_staff) WHERE is_staff = true;

-- ============================================
-- Helper function to check staff status (MUST BE FIRST)
-- This is SECURITY DEFINER to avoid recursive RLS checks
-- ============================================

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_staff = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_staff IS 'Check if the current user is a staff member (bypasses RLS)';

-- ============================================
-- Update RLS policies for staff access
-- NOTE: We use is_staff() function to avoid recursive RLS checks
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Staff can view all profiles" ON user_profiles;

-- Staff can view all profiles (uses is_staff() to avoid recursion)
CREATE POLICY "Staff can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (is_staff());

-- ============================================
-- Staff access to orders
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;

-- Staff can view all orders
CREATE POLICY "Staff can view all orders"
ON orders
FOR SELECT
TO authenticated
USING (is_staff());

-- ============================================
-- Staff access to conversations
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Staff can view all conversations" ON conversations;

-- Staff can view all conversations
CREATE POLICY "Staff can view all conversations"
ON conversations
FOR SELECT
TO authenticated
USING (is_staff());

-- ============================================
-- Staff access to messages
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Staff can view all messages" ON messages;

-- Staff can view all messages
CREATE POLICY "Staff can view all messages"
ON messages
FOR SELECT
TO authenticated
USING (is_staff());

-- ============================================
-- Staff access to order_issues
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Staff can view all issues" ON order_issues;

-- Staff can view all issues
CREATE POLICY "Staff can view all issues"
ON order_issues
FOR SELECT
TO authenticated
USING (is_staff());

-- Staff can update issues (for resolution)
DROP POLICY IF EXISTS "Staff can update all issues" ON order_issues;

CREATE POLICY "Staff can update all issues"
ON order_issues
FOR UPDATE
TO authenticated
USING (is_staff())
WITH CHECK (is_staff());

-- ============================================
-- Staff access to tracking_events
-- ============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Staff can view all tracking" ON tracking_events;

-- Staff can view all tracking events
CREATE POLICY "Staff can view all tracking"
ON tracking_events
FOR SELECT
TO authenticated
USING (is_staff());

-- ============================================
-- Update user_profiles_full view to include is_staff
-- ============================================

DROP VIEW IF EXISTS user_profiles_full;

CREATE VIEW user_profiles_full AS
SELECT
  -- Core user fields
  u.id,
  u.full_name,
  u.email,
  u.phone,
  u.avatar_url,
  u.country,
  u.created_at,
  u.updated_at,
  u.deleted_at,
  u.deletion_reason,
  u.recovery_deadline,
  u.original_email,
  u.is_staff,

  -- Seller fields from seller_profiles (with defaults for non-sellers)
  COALESCE(s.seller_status, 'not_started') as seller_status,
  s.seller_terms_accepted_at,
  COALESCE(s.seller_terms_version, '1.0') as seller_terms_version,
  s.stripe_connect_account_id,
  COALESCE(s.stripe_connect_onboarding_completed, false) as stripe_connect_onboarding_completed,
  COALESCE(s.stripe_connect_charges_enabled, false) as stripe_connect_charges_enabled,
  COALESCE(s.stripe_connect_payouts_enabled, false) as stripe_connect_payouts_enabled,
  COALESCE(s.stripe_connect_details_submitted, false) as stripe_connect_details_submitted,
  s.stripe_connect_updated_at,
  COALESCE(s.stripe_requirements, '{}') as stripe_requirements,
  COALESCE(s.stripe_capabilities, '{}') as stripe_capabilities,
  COALESCE(s.dac7_annual_transaction_count, 0) as dac7_annual_transaction_count,
  COALESCE(s.dac7_annual_sales_total, 0.00) as dac7_annual_sales_total,
  s.dac7_reporting_year,
  s.dac7_tax_id,
  s.dac7_tax_id_type,
  COALESCE(s.has_bank_account, false) as has_bank_account,
  s.bank_account_last4,
  s.bank_account_bank_name

FROM user_profiles u
LEFT JOIN seller_profiles s ON u.id = s.user_id;

-- ============================================
-- Comments
-- ============================================

COMMENT ON COLUMN user_profiles.is_staff IS 'Whether the user has staff/admin privileges for support access';
