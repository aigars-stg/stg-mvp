-- Migration: Optimize Remaining RLS Auth Calls
-- Description: Fix remaining tables that still use auth.uid() without subquery
-- Continuation of 057_optimize_rls_auth_calls.sql
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- ORDERS TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view their orders" ON orders;
CREATE POLICY "Buyers can view their orders"
  ON orders
  FOR SELECT
  USING ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
CREATE POLICY "Sellers can view their orders"
  ON orders
  FOR SELECT
  USING ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Sellers can respond to orders" ON orders;
CREATE POLICY "Sellers can respond to orders"
  ON orders
  FOR UPDATE
  USING ((select auth.uid()) = seller_id AND status = 'pending_seller')
  WITH CHECK ((select auth.uid()) = seller_id);

-- ============================================================================
-- ORDER_ITEMS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Order participants can view items" ON order_items;
CREATE POLICY "Order participants can view items"
  ON order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = (select auth.uid()) OR seller_id = (select auth.uid())
    )
  );

-- ============================================================================
-- ORDER_ISSUES TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Order participants can view issues" ON order_issues;
CREATE POLICY "Order participants can view issues"
  ON order_issues
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = (select auth.uid()) OR seller_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Order participants can report issues" ON order_issues;
CREATE POLICY "Order participants can report issues"
  ON order_issues
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = reporter_id AND
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = (select auth.uid()) OR seller_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Reporters can update their issues" ON order_issues;
CREATE POLICY "Reporters can update their issues"
  ON order_issues
  FOR UPDATE
  USING ((select auth.uid()) = reporter_id AND status = 'open')
  WITH CHECK ((select auth.uid()) = reporter_id);

-- ============================================================================
-- TRACKING_EVENTS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Order participants can view tracking" ON tracking_events;
CREATE POLICY "Order participants can view tracking"
  ON tracking_events
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = (select auth.uid()) OR seller_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PAYOUT_TRANSACTIONS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Sellers can view their payouts" ON payout_transactions;
CREATE POLICY "Sellers can view their payouts"
  ON payout_transactions
  FOR SELECT
  USING ((select auth.uid()) = seller_id);

-- ============================================================================
-- SELLER_PAYOUTS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own payouts" ON seller_payouts;
CREATE POLICY "Users can view own payouts"
  ON seller_payouts
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- SELLER_PROFILES TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own seller profile" ON seller_profiles;
CREATE POLICY "Users can view their own seller profile"
  ON seller_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own seller profile" ON seller_profiles;
CREATE POLICY "Users can update their own seller profile"
  ON seller_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own seller profile" ON seller_profiles;
CREATE POLICY "Users can insert their own seller profile"
  ON seller_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- SELLER_REVIEWS TABLE (3 policies with auth.uid())
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can create reviews for their orders" ON seller_reviews;
CREATE POLICY "Buyers can create reviews for their orders"
  ON seller_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = buyer_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.buyer_id = (select auth.uid())
        AND orders.status IN ('delivered', 'completed')
    )
  );

DROP POLICY IF EXISTS "Buyers can update their review text" ON seller_reviews;
CREATE POLICY "Buyers can update their review text"
  ON seller_reviews
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = buyer_id)
  WITH CHECK ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Sellers can respond to their reviews" ON seller_reviews;
CREATE POLICY "Sellers can respond to their reviews"
  ON seller_reviews
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = seller_id)
  WITH CHECK ((select auth.uid()) = seller_id);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

-- This migration optimizes remaining RLS policies by wrapping auth.uid() calls in subqueries.
-- Tables covered: orders, order_items, order_issues, tracking_events, payout_transactions,
-- seller_payouts, seller_profiles, seller_reviews
