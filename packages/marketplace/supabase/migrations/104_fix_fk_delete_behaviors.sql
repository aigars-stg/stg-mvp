-- ============================================================================
-- Migration: Fix FK ON DELETE Behaviors
-- Purpose: Add ON DELETE SET NULL to optional FK references
-- Created: 2026-01-24
--
-- Issue: 5 FK columns default to NO ACTION, which blocks user deletion
-- even when the reference is optional (nullable column).
--
-- Edge Case Fixed: When a user is deleted while having items in cart,
-- the listing's reserved_until timestamp must also be cleared, otherwise
-- the listing becomes "ghost reserved" (reserved_by=NULL but reserved_until
-- still blocks new reservations until it expires).
-- ============================================================================

-- ============================================================================
-- TRIGGER: Clear reservation timestamps when user is deleted
-- ============================================================================
-- This runs BEFORE the FK cascade sets reserved_by to NULL, ensuring
-- both fields are cleared atomically.
-- ============================================================================
CREATE OR REPLACE FUNCTION clear_listing_reservations_on_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clear both reserved_by AND reserved_until for any listings this user reserved
  UPDATE listings
  SET reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE reserved_by = OLD.id;

  RETURN OLD;
END;
$$;

-- Attach to auth.users (runs before CASCADE propagates)
DROP TRIGGER IF EXISTS clear_reservations_before_user_delete ON auth.users;
CREATE TRIGGER clear_reservations_before_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION clear_listing_reservations_on_user_delete();

COMMENT ON FUNCTION clear_listing_reservations_on_user_delete() IS
'Clears both reserved_by and reserved_until on listings when a user is deleted.
Prevents "ghost reservations" where reserved_until blocks new carts but
reserved_by is NULL (orphaned by FK cascade).';

-- ============================================================================
-- FK CONSTRAINT FIXES
-- ============================================================================

-- 1. listings.auction_winner_id
-- When: Auction winner's account is deleted
-- Behavior: Clear winner reference (auction stays, winner anonymized)
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_auction_winner_id_fkey;

ALTER TABLE listings
  ADD CONSTRAINT listings_auction_winner_id_fkey
  FOREIGN KEY (auction_winner_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 2. listings.reserved_by
-- When: User with cart reservation deletes account
-- Behavior: Clear reservation (listing becomes available again)
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_reserved_by_fkey;

ALTER TABLE listings
  ADD CONSTRAINT listings_reserved_by_fkey
  FOREIGN KEY (reserved_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 3. orders.cancelled_by
-- When: User who cancelled an order deletes account
-- Behavior: Preserve order history, clear canceller reference
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_cancelled_by_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_cancelled_by_fkey
  FOREIGN KEY (cancelled_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 4. order_issues.resolved_by
-- When: Staff member who resolved issue leaves
-- Behavior: Preserve resolution, clear staff reference
ALTER TABLE order_issues
  DROP CONSTRAINT IF EXISTS order_issues_resolved_by_fkey;

ALTER TABLE order_issues
  ADD CONSTRAINT order_issues_resolved_by_fkey
  FOREIGN KEY (resolved_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 5. user_feedback.reviewed_by
-- When: Staff member who reviewed feedback leaves
-- Behavior: Preserve review status, clear staff reference
ALTER TABLE user_feedback
  DROP CONSTRAINT IF EXISTS user_feedback_reviewed_by_fkey;

ALTER TABLE user_feedback
  ADD CONSTRAINT user_feedback_reviewed_by_fkey
  FOREIGN KEY (reviewed_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- Verification query (run after migration):
-- ============================================================================
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table,
--   rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu
--   ON tc.constraint_name = ccu.constraint_name
-- JOIN information_schema.referential_constraints rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
--   AND kcu.column_name IN ('auction_winner_id', 'reserved_by', 'cancelled_by', 'resolved_by', 'reviewed_by');
