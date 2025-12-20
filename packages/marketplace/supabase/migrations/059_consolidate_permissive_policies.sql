-- Migration: Consolidate Multiple Permissive Policies
-- Description: Merge multiple permissive policies for same role/action into single policies
-- Fixes Supabase Performance Advisor warnings for multiple_permissive_policies
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- ============================================================================
-- BASKETS TABLE - Consolidate 2 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view their baskets" ON baskets;
DROP POLICY IF EXISTS "Sellers can view baskets for their listings" ON baskets;

CREATE POLICY "Users can view their baskets"
  ON baskets
  FOR SELECT
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

-- ============================================================================
-- LISTINGS TABLE - Consolidate 3 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Public read access for active listings" ON listings;
DROP POLICY IF EXISTS "Sellers can view their own listings" ON listings;
DROP POLICY IF EXISTS "Buyers can view their reserved listings" ON listings;

CREATE POLICY "Users can view listings"
  ON listings
  FOR SELECT
  USING (
    status = 'active'
    OR (select auth.uid()) = seller_id
    OR (select auth.uid()) = reserved_by
  );

-- ============================================================================
-- LOGIN_ACTIVITY TABLE - Remove duplicate policies
-- ============================================================================

-- Remove duplicate SELECT policies (keep one)
DROP POLICY IF EXISTS "Users can read their own login activity" ON login_activity;
DROP POLICY IF EXISTS "Users can view their own login activity" ON login_activity;

CREATE POLICY "Users can view their own login activity"
  ON login_activity
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Remove duplicate INSERT policies (keep one)
DROP POLICY IF EXISTS "Service role can insert login activity" ON login_activity;
DROP POLICY IF EXISTS "Users can insert their own login activity" ON login_activity;

CREATE POLICY "Users can insert their own login activity"
  ON login_activity
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- ORDERS TABLE - Consolidate 2 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view their orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;

CREATE POLICY "Users can view their orders"
  ON orders
  FOR SELECT
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

-- ============================================================================
-- SELLER_REVIEWS TABLE - Consolidate 2 UPDATE policies into 1
-- Both buyers (update review_text) and sellers (add seller_response) need UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can update their review text" ON seller_reviews;
DROP POLICY IF EXISTS "Sellers can respond to their reviews" ON seller_reviews;

CREATE POLICY "Participants can update reviews"
  ON seller_reviews
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  )
  WITH CHECK (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

-- ============================================================================
-- WANTED_LISTING_RESPONSES TABLE - Consolidate 2 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view responses to their ISOs" ON wanted_listing_responses;
DROP POLICY IF EXISTS "Sellers can view their own responses" ON wanted_listing_responses;

CREATE POLICY "Users can view wanted listing responses"
  ON wanted_listing_responses
  FOR SELECT
  USING (
    (select auth.uid()) = seller_id
    OR EXISTS (
      SELECT 1 FROM wanted_listings
      WHERE id = wanted_listing_id
      AND buyer_id = (select auth.uid())
    )
  );

-- ============================================================================
-- WANTED_LISTINGS TABLE - Consolidate 2 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Public read access for active wanted listings" ON wanted_listings;
DROP POLICY IF EXISTS "Buyers can view their own wanted listings" ON wanted_listings;

CREATE POLICY "Users can view wanted listings"
  ON wanted_listings
  FOR SELECT
  USING (
    status = 'active'
    OR (select auth.uid()) = buyer_id
  );

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

-- This migration consolidates multiple permissive policies into single policies.
-- Multiple permissive policies for the same role/action are suboptimal because
-- PostgreSQL must evaluate each policy for every query, even if one already passes.
-- Using OR conditions in a single policy is more efficient.
