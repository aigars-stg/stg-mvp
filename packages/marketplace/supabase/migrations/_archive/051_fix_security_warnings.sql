-- Migration: Fix Supabase Security Lint Warnings
-- Description: 
-- 1. Moves pg_trgm extension to 'extensions' schema to keep public clean.
-- 2. Sets explicit search_path for all functions to prevent search path hijacking.

-- Step 1: Secure Extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_trgm to extensions schema
-- Note: This requires appropriate permissions. If this fails, potential manual intervention needed,
-- but usually safer to have it here.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Ensure public still has access to extension functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Step 2: Fix Function Search Paths
-- We set search_path = public, extensions for all functions to ensuring they can find 
-- both their own helpers (public) and extension functions (extensions) safely.

-- Utility / Time
ALTER FUNCTION public.riga_now SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at_column SET search_path = public, extensions;

-- Auth & Users
ALTER FUNCTION public.handle_new_user SET search_path = public, extensions;
ALTER FUNCTION public.is_user_blocked SET search_path = public, extensions;
ALTER FUNCTION public.cleanup_old_login_activity SET search_path = public, extensions;

-- Listings
ALTER FUNCTION public.is_listing_available SET search_path = public, extensions;
ALTER FUNCTION public.update_listings_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.update_saved_listings_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.update_listing_status_timestamps SET search_path = public, extensions;
ALTER FUNCTION public.reserve_listing SET search_path = public, extensions;
ALTER FUNCTION public.release_listing_reservation SET search_path = public, extensions;
ALTER FUNCTION public.release_expired_reservations SET search_path = public, extensions;

-- Cart & Basket
ALTER FUNCTION public.get_cart SET search_path = public, extensions;
ALTER FUNCTION public.add_to_cart SET search_path = public, extensions;
ALTER FUNCTION public.remove_from_cart SET search_path = public, extensions;
ALTER FUNCTION public.update_basket_timestamp SET search_path = public, extensions;
ALTER FUNCTION public.delete_empty_basket SET search_path = public, extensions;
ALTER FUNCTION public.cleanup_expired_cart_items SET search_path = public, extensions;
ALTER FUNCTION public.create_order_from_basket SET search_path = public, extensions;

-- Sellers
ALTER FUNCTION public.seller_onboarding_completed SET search_path = public, extensions;
ALTER FUNCTION public.seller_requires_dac7_reporting SET search_path = public, extensions;
ALTER FUNCTION public.get_seller_onboarding_status SET search_path = public, extensions;
ALTER FUNCTION public.update_seller_dac7_metrics SET search_path = public, extensions;
ALTER FUNCTION public.update_seller_payouts_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.get_seller_payout_stats SET search_path = public, extensions;
ALTER FUNCTION public.update_payout_transactions_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.seller_can_receive_payouts SET search_path = public, extensions;
ALTER FUNCTION public.get_pending_payouts SET search_path = public, extensions;
ALTER FUNCTION public.update_seller_review_stats SET search_path = public, extensions;
ALTER FUNCTION public.update_seller_completed_sales SET search_path = public, extensions;
ALTER FUNCTION public.get_seller_trust_summary SET search_path = public, extensions;

-- Orders
ALTER FUNCTION public.update_orders_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.generate_order_number SET search_path = public, extensions;
ALTER FUNCTION public.seller_accept_order SET search_path = public, extensions;
ALTER FUNCTION public.seller_decline_order SET search_path = public, extensions;
ALTER FUNCTION public.handle_expired_seller_deadlines SET search_path = public, extensions;
ALTER FUNCTION public.can_buyer_review_order SET search_path = public, extensions;

-- Tracking & Issues
ALTER FUNCTION public.update_order_issues_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.mark_order_disputed SET search_path = public, extensions;
ALTER FUNCTION public.report_order_issue SET search_path = public, extensions;
ALTER FUNCTION public.add_tracking_event SET search_path = public, extensions;
ALTER FUNCTION public.get_order_tracking SET search_path = public, extensions;

-- Messaging / ISO
ALTER FUNCTION public.update_conversation_timestamp SET search_path = public, extensions;
ALTER FUNCTION public.get_unread_message_count SET search_path = public, extensions;
ALTER FUNCTION public.increment_response_count SET search_path = public, extensions;
ALTER FUNCTION public.decrement_response_count SET search_path = public, extensions;
ALTER FUNCTION public.can_respond_to_wanted_listing SET search_path = public, extensions;
ALTER FUNCTION public.is_quick_response SET search_path = public, extensions;
ALTER FUNCTION public.expire_wanted_listings SET search_path = public, extensions;
