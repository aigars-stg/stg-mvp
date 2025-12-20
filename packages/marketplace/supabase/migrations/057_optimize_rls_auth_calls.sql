-- Migration: Optimize RLS Auth Calls
-- Description: Wrap auth.uid() in subqueries to prevent per-row re-evaluation
-- Fixes Supabase Performance Advisor warnings for auth_rls_initplan
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- LISTINGS TABLE (5 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Sellers can view their own listings" ON listings;
CREATE POLICY "Sellers can view their own listings"
  ON listings
  FOR SELECT
  USING ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Authenticated users can create listings" ON listings;
CREATE POLICY "Authenticated users can create listings"
  ON listings
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = seller_id AND
    status IN ('draft', 'active')
  );

DROP POLICY IF EXISTS "Sellers can update their own listings" ON listings;
CREATE POLICY "Sellers can update their own listings"
  ON listings
  FOR UPDATE
  USING ((select auth.uid()) = seller_id)
  WITH CHECK ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Sellers can delete their own listings" ON listings;
CREATE POLICY "Sellers can delete their own listings"
  ON listings
  FOR DELETE
  USING ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Buyers can view their reserved listings" ON listings;
CREATE POLICY "Buyers can view their reserved listings"
  ON listings
  FOR SELECT
  USING ((select auth.uid()) = reserved_by);

-- ============================================================================
-- USER_PROFILES TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- LOGIN_ACTIVITY TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their own login activity" ON login_activity;
CREATE POLICY "Users can read their own login activity"
  ON login_activity
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role can insert login activity" ON login_activity;
CREATE POLICY "Service role can insert login activity"
  ON login_activity
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own login activity" ON login_activity;
CREATE POLICY "Users can delete their own login activity"
  ON login_activity
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Also fix the duplicate policies from fix-permissions.sql if they exist
DROP POLICY IF EXISTS "Users can view their own login activity" ON login_activity;
CREATE POLICY "Users can view their own login activity"
  ON login_activity
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own login activity" ON login_activity;
CREATE POLICY "Users can insert their own login activity"
  ON login_activity
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- CONVERSATIONS TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id
  );

DROP POLICY IF EXISTS "Buyers can create conversations" ON conversations;
CREATE POLICY "Buyers can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = buyer_id
    AND buyer_id != seller_id
    AND (
      -- For wanted listings: listing_id is null, no listing check needed
      listing_id IS NULL
      OR
      -- For regular listings: listing_id must reference an active listing
      EXISTS (
        SELECT 1 FROM listings
        WHERE id = listing_id
        AND status = 'active'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = seller_id AND blocked_id = buyer_id)
      OR (blocker_id = buyer_id AND blocked_id = seller_id)
    )
  );

DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id)
  WITH CHECK ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

-- ============================================================================
-- MESSAGES TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND (buyer_id = (select auth.uid()) OR seller_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (buyer_id = (select auth.uid()) OR seller_id = (select auth.uid()))
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      INNER JOIN conversations c ON c.id = conversation_id
      WHERE (
        (bu.blocker_id = c.buyer_id AND bu.blocked_id = c.seller_id)
        OR (bu.blocker_id = c.seller_id AND bu.blocked_id = c.buyer_id)
      )
    )
  );

DROP POLICY IF EXISTS "Senders can delete their messages" ON messages;
CREATE POLICY "Senders can delete their messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()) AND deleted_at IS NOT NULL);

-- ============================================================================
-- MESSAGE_READ_STATUS TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own read status" ON message_read_status;
CREATE POLICY "Users can view their own read status"
  ON message_read_status
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own read status" ON message_read_status;
CREATE POLICY "Users can insert their own read status"
  ON message_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (buyer_id = (select auth.uid()) OR seller_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can update their own read status" ON message_read_status;
CREATE POLICY "Users can update their own read status"
  ON message_read_status
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- BLOCKED_USERS TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their blocks" ON blocked_users;
CREATE POLICY "Users can view their blocks"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can block others" ON blocked_users;
CREATE POLICY "Users can block others"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()) AND blocker_id != blocked_id);

DROP POLICY IF EXISTS "Users can unblock" ON blocked_users;
CREATE POLICY "Users can unblock"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (blocker_id = (select auth.uid()));

-- ============================================================================
-- WANTED_LISTINGS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view their own wanted listings" ON wanted_listings;
CREATE POLICY "Buyers can view their own wanted listings"
  ON wanted_listings
  FOR SELECT
  USING ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Authenticated users can create wanted listings" ON wanted_listings;
CREATE POLICY "Authenticated users can create wanted listings"
  ON wanted_listings
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = buyer_id
    AND status IN ('active')
    AND expires_at > NOW()
  );

DROP POLICY IF EXISTS "Buyers can update their own wanted listings" ON wanted_listings;
CREATE POLICY "Buyers can update their own wanted listings"
  ON wanted_listings
  FOR UPDATE
  USING ((select auth.uid()) = buyer_id)
  WITH CHECK ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Buyers can delete their own wanted listings" ON wanted_listings;
CREATE POLICY "Buyers can delete their own wanted listings"
  ON wanted_listings
  FOR DELETE
  USING ((select auth.uid()) = buyer_id);

-- ============================================================================
-- WANTED_LISTING_RESPONSES TABLE (5 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view responses to their ISOs" ON wanted_listing_responses;
CREATE POLICY "Buyers can view responses to their ISOs"
  ON wanted_listing_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wanted_listings
      WHERE id = wanted_listing_id
      AND buyer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Sellers can view their own responses" ON wanted_listing_responses;
CREATE POLICY "Sellers can view their own responses"
  ON wanted_listing_responses
  FOR SELECT
  USING ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Authenticated users can create responses" ON wanted_listing_responses;
CREATE POLICY "Authenticated users can create responses"
  ON wanted_listing_responses
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = seller_id
    AND can_respond_to_wanted_listing(wanted_listing_id, seller_id)
  );

DROP POLICY IF EXISTS "Sellers can update their own responses" ON wanted_listing_responses;
CREATE POLICY "Sellers can update their own responses"
  ON wanted_listing_responses
  FOR UPDATE
  USING ((select auth.uid()) = seller_id)
  WITH CHECK ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Sellers can delete their own responses" ON wanted_listing_responses;
CREATE POLICY "Sellers can delete their own responses"
  ON wanted_listing_responses
  FOR DELETE
  USING ((select auth.uid()) = seller_id);

-- ============================================================================
-- SAVED_LISTINGS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own saved listings" ON saved_listings;
CREATE POLICY "Users can view their own saved listings"
  ON saved_listings
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can save listings" ON saved_listings;
CREATE POLICY "Users can save listings"
  ON saved_listings
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their saved listings" ON saved_listings;
CREATE POLICY "Users can delete their saved listings"
  ON saved_listings
  FOR DELETE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their saved listings" ON saved_listings;
CREATE POLICY "Users can update their saved listings"
  ON saved_listings
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- BASKETS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view their baskets" ON baskets;
CREATE POLICY "Buyers can view their baskets"
  ON baskets
  FOR SELECT
  USING ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Sellers can view baskets for their listings" ON baskets;
CREATE POLICY "Sellers can view baskets for their listings"
  ON baskets
  FOR SELECT
  USING ((select auth.uid()) = seller_id);

DROP POLICY IF EXISTS "Buyers can create baskets" ON baskets;
CREATE POLICY "Buyers can create baskets"
  ON baskets
  FOR INSERT
  WITH CHECK ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Buyers can delete their baskets" ON baskets;
CREATE POLICY "Buyers can delete their baskets"
  ON baskets
  FOR DELETE
  USING ((select auth.uid()) = buyer_id);

-- ============================================================================
-- BASKET_ITEMS TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can view their basket items" ON basket_items;
CREATE POLICY "Buyers can view their basket items"
  ON basket_items
  FOR SELECT
  USING (
    basket_id IN (SELECT id FROM baskets WHERE buyer_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Buyers can add basket items" ON basket_items;
CREATE POLICY "Buyers can add basket items"
  ON basket_items
  FOR INSERT
  WITH CHECK (
    basket_id IN (SELECT id FROM baskets WHERE buyer_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Buyers can remove basket items" ON basket_items;
CREATE POLICY "Buyers can remove basket items"
  ON basket_items
  FOR DELETE
  USING (
    basket_id IN (SELECT id FROM baskets WHERE buyer_id = (select auth.uid()))
  );

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

-- This migration optimizes all RLS policies by wrapping auth.uid() calls in subqueries.
-- This prevents PostgreSQL from re-evaluating the auth function for each row,
-- significantly improving query performance at scale.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
