-- Migration: Secure Profiles Views
-- Description: Replaces vulnerable public RLS policies on user_profiles and seller_profiles with secure views
-- Security Fix: Prevents public access to PII (email, phone, tax ID, bank info)

-- ============================================================================
-- STEP 1: Secure user_profiles
-- ============================================================================

-- 1.1 Drop the vulnerable policy
DROP POLICY IF EXISTS "Public can read seller profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can read user profiles" ON user_profiles; -- Just in case naming varied

-- 1.2 Create secure view for public profile data
-- Only exposes insensitive fields
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id, 
  full_name, 
  avatar_url, 
  country, 
  created_at
FROM user_profiles;

-- 1.3 Grant access to the view
GRANT SELECT ON public_profiles TO public;
GRANT SELECT ON public_profiles TO anon;
GRANT SELECT ON public_profiles TO authenticated;

-- ============================================================================
-- STEP 2: Secure seller_profiles
-- ============================================================================

-- 2.1 Drop the vulnerable policy
DROP POLICY IF EXISTS "Public can read seller profiles" ON seller_profiles;

-- 2.2 Create secure view for public seller data (Trust Signals)
-- Only exposes fields needed for ratings/trust/badges
CREATE OR REPLACE VIEW public_seller_profiles AS
SELECT 
  user_id,
  seller_status,
  created_at,
  -- Trust signals
  total_reviews,
  average_rating,
  positive_rating_percent,
  total_completed_sales,
  member_since,
  -- We specifically DO NOT include:
  -- stripe_connect_account_id (internal)
  -- dac7_* (tax info)
  -- bank_account_* (financial info)
  -- stripe_requirements/capabilities (internal compliance)
  -- stripe_connect_*_enabled (internal status)
  
  -- Calculated/Virtual fields for convenience (replicating logic from get_seller_trust_summary)
  CASE
    WHEN total_completed_sales >= 25 AND average_rating >= 4.8 THEN 'top_seller'
    WHEN total_completed_sales >= 5 AND average_rating >= 4.5 THEN 'trusted_seller'
    ELSE 'new_seller'
  END as badge_tier
FROM seller_profiles
WHERE seller_status = 'active'; -- Only show active sellers publicly

-- 2.3 Grant access to the view
GRANT SELECT ON public_seller_profiles TO public;
GRANT SELECT ON public_seller_profiles TO anon;
GRANT SELECT ON public_seller_profiles TO authenticated;

-- ============================================================================
-- STEP 3: Comments
-- ============================================================================

COMMENT ON VIEW public_profiles IS 'Secure view of user profiles for public display (No PII)';
COMMENT ON VIEW public_seller_profiles IS 'Secure view of seller profiles for trust signals (No Tax/Bank Info)';
