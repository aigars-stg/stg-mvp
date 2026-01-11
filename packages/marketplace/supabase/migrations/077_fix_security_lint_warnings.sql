-- Migration: Fix Supabase Security Lint Warnings
-- Description:
-- 1. Removes SECURITY DEFINER from views (should use SECURITY INVOKER)
-- 2. Sets search_path for functions missing it
-- 3. Fixes overly permissive RLS policy on games table
-- 4. Adds RLS to security_audit_log table

-- ============================================================================
-- STEP 1: Fix SECURITY DEFINER Views
-- Views should use SECURITY INVOKER (the default in modern PostgreSQL)
-- to respect the calling user's permissions
-- ============================================================================

-- Recreate listing_questions_with_author view without SECURITY DEFINER
DROP VIEW IF EXISTS listing_questions_with_author;

CREATE VIEW listing_questions_with_author
WITH (security_invoker = true) AS
SELECT
  lq.id,
  lq.listing_id,
  lq.user_id,
  lq.content,
  lq.parent_id,
  lq.created_at,
  lq.updated_at,
  lq.deleted_at,
  up.full_name AS author_name,
  up.avatar_url AS author_avatar,
  -- Determine if author is the listing's seller
  (lq.user_id = l.seller_id) AS is_seller
FROM listing_questions lq
JOIN user_profiles up ON lq.user_id = up.id
JOIN listings l ON lq.listing_id = l.id
WHERE lq.deleted_at IS NULL;

COMMENT ON VIEW listing_questions_with_author IS 'Public Q&A on listings with author info. Uses SECURITY INVOKER for proper RLS.';

-- Recreate user_profiles_full view without SECURITY DEFINER
DROP VIEW IF EXISTS user_profiles_full;

CREATE VIEW user_profiles_full
WITH (security_invoker = true) AS
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

COMMENT ON VIEW user_profiles_full IS 'Backward-compatible view combining user_profiles with seller_profiles. Uses SECURITY INVOKER for proper RLS.';

-- ============================================================================
-- STEP 2: Fix Function Search Paths
-- Set search_path for all functions that are missing it
-- ============================================================================

-- Functions from migration 070 (listing questions)
ALTER FUNCTION public.update_listing_question_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.check_question_depth() SET search_path = public, extensions;
ALTER FUNCTION public.get_listing_question_count(UUID) SET search_path = public, extensions;

-- Functions from migration 066 (transaction conversations)
ALTER FUNCTION public.post_transaction_system_message(UUID, VARCHAR, TEXT) SET search_path = public, extensions;
ALTER FUNCTION public.get_or_create_transaction_conversation(UUID) SET search_path = public, extensions;

-- Functions from migration 063 (pricing cache)
ALTER FUNCTION public.set_pricing_cache_expiry() SET search_path = public, extensions;

-- Functions from migration 068 (staff flag)
-- Note: is_staff() is SECURITY DEFINER intentionally to avoid recursive RLS
ALTER FUNCTION public.is_staff() SET search_path = public, extensions;

-- Functions from migration 075 (security audit log)
ALTER FUNCTION public.cleanup_old_security_audit_logs() SET search_path = public, extensions;

-- Functions from migration 076 (recovery codes)
ALTER FUNCTION public.consume_recovery_code(UUID, TEXT) SET search_path = public, extensions;

-- Re-check handle_new_user (might have been missed in 051 or altered since)
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions;

-- ============================================================================
-- STEP 3: Fix Games Table RLS Policy
-- The "Allow metadata updates" policy is flagged as overly permissive.
-- Change it to only allow updates via service_role (server-side API calls).
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow metadata updates" ON games;

-- Note: The games table metadata is updated server-side via service_role client,
-- which bypasses RLS entirely. So we don't need a permissive policy at all.
-- If we need authenticated users to update games (unlikely), we can add a
-- more restrictive policy later.

-- Add comment explaining why there's no update policy
COMMENT ON TABLE games IS 'Board game catalog from BGG. Updates happen via service_role (bypasses RLS) during BGG data caching.';

-- ============================================================================
-- STEP 4: Ensure security_audit_log has proper RLS
-- (Already done in migration 075, but verify policies exist)
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Verify policies exist (these are created in 075, just ensuring they're present)
-- Users can read their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_audit_log'
    AND policyname = 'Users can read own security events'
  ) THEN
    CREATE POLICY "Users can read own security events"
    ON security_audit_log
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Staff can read all events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_audit_log'
    AND policyname = 'Staff can read all security events'
  ) THEN
    CREATE POLICY "Staff can read all security events"
    ON security_audit_log
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND is_staff = true
      )
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Document the materialized view exposure (intentional)
-- ============================================================================

-- The stats_game_pricing materialized view is intentionally accessible
-- to authenticated users for displaying price suggestions. This is safe
-- as it contains only aggregate pricing data, not user-specific information.
COMMENT ON MATERIALIZED VIEW stats_game_pricing IS 'Aggregate game pricing statistics for price suggestions. Intentionally readable by authenticated users.';
