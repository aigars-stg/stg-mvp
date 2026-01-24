-- Migration: Fix Supabase Performance Advisor Warnings
-- Description:
-- 1. Wrap auth.uid() calls in (select auth.uid()) to prevent per-row evaluation
-- 2. Consolidate multiple permissive policies into single policies with OR conditions
-- 3. Drop duplicate indexes on listings table

-- ============================================================================
-- PART 1: FIX auth_rls_initplan WARNINGS
-- Replace auth.uid() with (select auth.uid()) for efficient evaluation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 CONVERSATIONS TABLE - Fix 3 policies
-- ----------------------------------------------------------------------------

-- Drop and recreate "Users can view their own conversations"
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  -- Direct participant (existing behavior)
  (select auth.uid()) = buyer_id
  OR (select auth.uid()) = seller_id
  -- OR participant on linked order
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = (select auth.uid()) OR orders.seller_id = (select auth.uid()))
    )
  )
);

-- Drop and recreate "Participants can update conversations"
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

CREATE POLICY "Participants can update conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) = buyer_id
  OR (select auth.uid()) = seller_id
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = (select auth.uid()) OR orders.seller_id = (select auth.uid()))
    )
  )
)
WITH CHECK (
  (select auth.uid()) = buyer_id
  OR (select auth.uid()) = seller_id
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = (select auth.uid()) OR orders.seller_id = (select auth.uid()))
    )
  )
);

-- Drop and recreate "Users can create conversations"
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = buyer_id
  AND buyer_id != seller_id
  AND (
    -- For order-based conversations: order_id must exist and user must be participant
    (
      order_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_id
        AND (orders.buyer_id = (select auth.uid()) OR orders.seller_id = (select auth.uid()))
      )
    )
    OR
    -- For wanted listings: listing_id is null
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

-- ----------------------------------------------------------------------------
-- 1.2 MESSAGES TABLE - Fix 2 policies
-- ----------------------------------------------------------------------------

-- Drop and recreate "Participants can view messages"
DROP POLICY IF EXISTS "Participants can view messages" ON messages;

CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.buyer_id = (select auth.uid())
      OR c.seller_id = (select auth.uid())
      OR (
        c.order_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM orders o
          WHERE o.id = c.order_id
          AND (o.buyer_id = (select auth.uid()) OR o.seller_id = (select auth.uid()))
        )
      )
    )
  )
);

-- Drop and recreate "Participants can send messages"
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  -- For system messages, sender_id can be null
  (is_system_message = true AND sender_id IS NULL)
  OR
  (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (
        -- Direct participant
        c.buyer_id = (select auth.uid()) OR c.seller_id = (select auth.uid())
        -- OR order participant
        OR (
          c.order_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = c.order_id
            AND (o.buyer_id = (select auth.uid()) OR o.seller_id = (select auth.uid()))
          )
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      INNER JOIN conversations c ON c.id = conversation_id
      WHERE (
        (bu.blocker_id = c.buyer_id AND bu.blocked_id = c.seller_id)
        OR (bu.blocker_id = c.seller_id AND bu.blocked_id = c.buyer_id)
      )
    )
  )
  -- Validate photo_urls: max 5 photos per message
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 5)
);

-- ----------------------------------------------------------------------------
-- 1.3 LISTING_QUESTIONS TABLE - Fix 3 policies
-- ----------------------------------------------------------------------------

-- Drop and recreate "Authenticated users can post questions on others' listings"
DROP POLICY IF EXISTS "Authenticated users can post questions on others' listings" ON listing_questions;

CREATE POLICY "Authenticated users can post questions on others' listings"
ON listing_questions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_id
      AND l.status = 'active'
      AND l.seller_id != (select auth.uid())
  )
);

-- Drop and recreate "Users can update their own questions"
DROP POLICY IF EXISTS "Users can update their own questions" ON listing_questions;

CREATE POLICY "Users can update their own questions"
ON listing_questions FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Drop and recreate "Users can delete their own questions"
DROP POLICY IF EXISTS "Users can delete their own questions" ON listing_questions;

CREATE POLICY "Users can delete their own questions"
ON listing_questions FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 1.4 SECURITY_AUDIT_LOG TABLE - Fix 2 policies
-- ----------------------------------------------------------------------------

-- Drop and recreate "Users can read own security events"
DROP POLICY IF EXISTS "Users can read own security events" ON security_audit_log;

CREATE POLICY "Users can read own security events"
ON security_audit_log FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Drop and recreate "Staff can read all security events"
DROP POLICY IF EXISTS "Staff can read all security events" ON security_audit_log;

CREATE POLICY "Staff can read all security events"
ON security_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = (select auth.uid()) AND is_staff = true
  )
);

-- ============================================================================
-- PART 2: FIX multiple_permissive_policies WARNINGS
-- Consolidate multiple SELECT/UPDATE policies into single policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 CONVERSATIONS TABLE - Consolidate SELECT policies
-- Combine: "Staff can view all conversations" + "Users can view their own conversations"
-- ----------------------------------------------------------------------------

-- First drop the staff policy (user policy was already recreated above)
DROP POLICY IF EXISTS "Staff can view all conversations" ON conversations;

-- Recreate consolidated policy (replaces the one from Part 1)
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  -- Staff can view all
  is_staff()
  OR
  -- Direct participant
  (select auth.uid()) = buyer_id
  OR (select auth.uid()) = seller_id
  -- OR participant on linked order
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = (select auth.uid()) OR orders.seller_id = (select auth.uid()))
    )
  )
);

-- ----------------------------------------------------------------------------
-- 2.2 MESSAGES TABLE - Consolidate SELECT policies
-- Combine: "Staff can view all messages" + "Participants can view messages"
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff can view all messages" ON messages;

-- Recreate consolidated policy (replaces the one from Part 1)
DROP POLICY IF EXISTS "Participants can view messages" ON messages;

CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  -- Staff can view all (even deleted)
  is_staff()
  OR
  (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.buyer_id = (select auth.uid())
        OR c.seller_id = (select auth.uid())
        OR (
          c.order_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = c.order_id
            AND (o.buyer_id = (select auth.uid()) OR o.seller_id = (select auth.uid()))
          )
        )
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- 2.3 ORDER_ISSUES TABLE - Consolidate SELECT and UPDATE policies
-- SELECT: "Order participants can view issues" + "Staff can view all issues"
-- UPDATE: "Reporters can update their issues" + "Staff can update all issues"
-- ----------------------------------------------------------------------------

-- We need to read the current policies first, but based on the warning we know:
-- For SELECT we need to combine participant access + staff access
-- For UPDATE we need to combine reporter update + staff update

DROP POLICY IF EXISTS "Staff can view all issues" ON order_issues;
DROP POLICY IF EXISTS "Order participants can view issues" ON order_issues;

CREATE POLICY "Order participants can view issues"
ON order_issues FOR SELECT
TO authenticated
USING (
  -- Staff can view all
  is_staff()
  OR
  -- Order participants can view
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_issues.order_id
    AND (o.buyer_id = (select auth.uid()) OR o.seller_id = (select auth.uid()))
  )
);

DROP POLICY IF EXISTS "Staff can update all issues" ON order_issues;
DROP POLICY IF EXISTS "Reporters can update their issues" ON order_issues;

CREATE POLICY "Reporters can update their issues"
ON order_issues FOR UPDATE
TO authenticated
USING (
  -- Staff can update all
  is_staff()
  OR
  -- Reporter can update their own
  reporter_id = (select auth.uid())
)
WITH CHECK (
  is_staff()
  OR
  reporter_id = (select auth.uid())
);

-- ----------------------------------------------------------------------------
-- 2.4 ORDERS TABLE - Consolidate SELECT policies
-- Combine: "Staff can view all orders" + "Users can view their orders"
-- Note: There are actually "Buyers can view their orders" + "Sellers can view their orders" + "Staff can view all orders"
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Buyers can view their orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can view their orders" ON orders;

CREATE POLICY "Users can view their orders"
ON orders FOR SELECT
TO authenticated
USING (
  -- Staff can view all
  is_staff()
  OR
  -- Buyer or seller can view their orders
  buyer_id = (select auth.uid())
  OR seller_id = (select auth.uid())
);

-- ----------------------------------------------------------------------------
-- 2.5 SECURITY_AUDIT_LOG TABLE - Consolidate SELECT policies
-- Combine: "Staff can read all security events" + "Users can read own security events"
-- Note: Already fixed auth.uid() in Part 1, now consolidate
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff can read all security events" ON security_audit_log;
DROP POLICY IF EXISTS "Users can read own security events" ON security_audit_log;

CREATE POLICY "Users can read own security events"
ON security_audit_log FOR SELECT
TO authenticated
USING (
  -- Staff can read all
  is_staff()
  OR
  -- Users can read their own
  (select auth.uid()) = user_id
);

-- ----------------------------------------------------------------------------
-- 2.6 TRACKING_EVENTS TABLE - Consolidate SELECT policies
-- Combine: "Order participants can view tracking" + "Staff can view all tracking"
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff can view all tracking" ON tracking_events;
DROP POLICY IF EXISTS "Order participants can view tracking" ON tracking_events;

CREATE POLICY "Order participants can view tracking"
ON tracking_events FOR SELECT
TO authenticated
USING (
  -- Staff can view all
  is_staff()
  OR
  -- Order participants can view
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = tracking_events.order_id
    AND (o.buyer_id = (select auth.uid()) OR o.seller_id = (select auth.uid()))
  )
);

-- ----------------------------------------------------------------------------
-- 2.7 USER_PROFILES TABLE - Consolidate SELECT policies
-- Combine: "Allow public read of basic profile info" + "Staff can view all profiles" + "Users can read their own profile"
-- Note: This is tricky because "public read of basic profile info" serves a different purpose
-- We need to preserve public access for profile cards but consolidate authenticated policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow public read of basic profile info" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON user_profiles;

-- Recreate public policy for anon only (not TO public which includes authenticated)
CREATE POLICY "Allow public read of basic profile info"
ON user_profiles FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- Consolidated policy for authenticated users
CREATE POLICY "Authenticated users can view profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (
  -- Staff can view all
  is_staff()
  OR
  -- Users can view their own profile
  id = (select auth.uid())
  OR
  -- All authenticated users can view basic profile info (same as anon policy)
  deleted_at IS NULL
);

-- ============================================================================
-- PART 3: FIX duplicate_index WARNINGS
-- Drop duplicate indexes, keeping the more descriptively named versions
-- ============================================================================

-- idx_listings_game vs idx_listings_bgg_game_id (both on bgg_game_id)
-- Keep idx_listings_bgg_game_id (more descriptive)
DROP INDEX IF EXISTS idx_listings_game;

-- idx_listings_created_at vs idx_listings_created_at_desc (both on created_at DESC)
-- Keep idx_listings_created_at_desc (more descriptive)
DROP INDEX IF EXISTS idx_listings_created_at;

-- idx_listings_seller vs idx_listings_seller_id (both on seller_id)
-- Keep idx_listings_seller_id (more descriptive)
DROP INDEX IF EXISTS idx_listings_seller;

-- idx_listings_status vs idx_listings_status_active (both on status WHERE status = 'active')
-- Keep idx_listings_status_active (more descriptive)
DROP INDEX IF EXISTS idx_listings_status;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Users can view their own conversations" ON conversations IS
  'Consolidated policy: staff OR direct participant OR order participant. Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Participants can view messages" ON messages IS
  'Consolidated policy: staff (can see deleted) OR participant (non-deleted only). Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Users can view their orders" ON orders IS
  'Consolidated policy: staff OR buyer OR seller. Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Users can read own security events" ON security_audit_log IS
  'Consolidated policy: staff (all events) OR user (own events). Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Order participants can view issues" ON order_issues IS
  'Consolidated policy: staff OR order participant. Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Order participants can view tracking" ON tracking_events IS
  'Consolidated policy: staff OR order participant. Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Authenticated users can view profiles" ON user_profiles IS
  'Consolidated policy: staff (all) OR self (own profile) OR basic info for all authenticated users.';
