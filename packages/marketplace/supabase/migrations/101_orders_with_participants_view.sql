-- Migration: Orders With Participants View
-- Purpose: Eliminate N+1 queries by pre-joining buyer/seller profile data
-- Created: 2026-01-24

-- ============================================================================
-- VIEW: orders_with_participants
-- Orders with buyer and seller profile data pre-joined
-- ============================================================================

-- NOTE: Emails intentionally excluded for privacy
-- Use the messaging system for buyer-seller communication
-- If email needed for specific operations (e.g., admin support), fetch separately

CREATE VIEW orders_with_participants AS
SELECT
  o.*,
  -- Buyer info (no email for privacy)
  buyer.full_name as buyer_name,
  buyer.avatar_url as buyer_avatar,
  buyer.country as buyer_country,
  -- Seller info (no email for privacy)
  seller.full_name as seller_name,
  seller.avatar_url as seller_avatar,
  seller.country as seller_country,
  -- Seller business info
  sp.stripe_connect_account_id as seller_stripe_account,
  sp.seller_status as seller_status
FROM orders o
LEFT JOIN user_profiles buyer ON o.buyer_id = buyer.id
LEFT JOIN user_profiles seller ON o.seller_id = seller.id
LEFT JOIN seller_profiles sp ON o.seller_id = sp.user_id;

-- RLS: View inherits RLS from base 'orders' table
-- Buyers see orders where buyer_id = auth.uid()
-- Sellers see orders where seller_id = auth.uid()
-- Staff can see all orders via is_staff()

COMMENT ON VIEW orders_with_participants IS
  'Orders with pre-joined buyer and seller profile data. Eliminates N+1 queries.

   USAGE: Replace .from(''orders'') with .from(''orders_with_participants'')
   in API routes that need buyer/seller names.

   INCLUDED FIELDS:
   - All columns from orders table
   - buyer_name, buyer_avatar, buyer_country
   - seller_name, seller_avatar, seller_country
   - seller_stripe_account, seller_status

   PRIVACY: Emails intentionally excluded.
   Use messaging system for communication.
   Fetch emails separately for admin operations only.

   RLS: Inherits from orders table - buyers see their orders, sellers see their orders.';
