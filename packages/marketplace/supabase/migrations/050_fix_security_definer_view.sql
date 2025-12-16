-- Migration: Fix Security Definer View warning for user_profiles_full
-- Description: Recreates user_profiles_full with security_invoker=true to ensure RLS is enforced
-- Problem: Previous view definition implicitly utilized owner permissions (Security Definer behavior),
--          which could bypass RLS policies on underlying tables.
-- Fix: Using WITH (security_invoker = true) forces the view to run with the permissions and RLS 
--      context of the query invoker (the authenticated user).

DROP VIEW IF EXISTS user_profiles_full;

CREATE OR REPLACE VIEW user_profiles_full WITH (security_invoker = true) AS
SELECT
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
  
  -- Retain 044 columns
  u.profile_banner_dismissed_until,
  u.onboarding_email_step,
  u.last_onboarding_email_at,

  -- Seller fields sourced from seller_profiles
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

COMMENT ON VIEW user_profiles_full IS 'Backward-compatible view combining user_profiles with seller_profiles. Enforces RLS via security_invoker=true.';

-- 2. Fix public_profiles
DROP VIEW IF EXISTS public_profiles;
CREATE OR REPLACE VIEW public_profiles WITH (security_invoker = true) AS
SELECT 
  id, 
  full_name, 
  avatar_url, 
  country, 
  created_at
FROM user_profiles;

GRANT SELECT ON public_profiles TO public;
GRANT SELECT ON public_profiles TO anon;
GRANT SELECT ON public_profiles TO authenticated;

COMMENT ON VIEW public_profiles IS 'Secure view of user profiles for public display (No PII). Enforces RLS via security_invoker=true.';

-- 3. Fix public_seller_profiles
DROP VIEW IF EXISTS public_seller_profiles;
CREATE OR REPLACE VIEW public_seller_profiles WITH (security_invoker = true) AS
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
  -- Calculated/Virtual fields
  CASE
    WHEN total_completed_sales >= 25 AND average_rating >= 4.8 THEN 'top_seller'
    WHEN total_completed_sales >= 5 AND average_rating >= 4.5 THEN 'trusted_seller'
    ELSE 'new_seller'
  END as badge_tier
FROM seller_profiles
WHERE seller_status = 'active';

GRANT SELECT ON public_seller_profiles TO public;
GRANT SELECT ON public_seller_profiles TO anon;
GRANT SELECT ON public_seller_profiles TO authenticated;

COMMENT ON VIEW public_seller_profiles IS 'Secure view of seller profiles for trust signals (No Tax/Bank Info). Enforces RLS via security_invoker=true.';

-- 4. Fix seller_reviews_with_buyer
DROP VIEW IF EXISTS seller_reviews_with_buyer;
CREATE OR REPLACE VIEW seller_reviews_with_buyer WITH (security_invoker = true) AS
SELECT
  sr.id,
  sr.order_id,
  sr.seller_id,
  sr.buyer_id,
  sr.rating,
  sr.review_text,
  sr.seller_response,
  sr.seller_responded_at,
  sr.created_at,
  sr.updated_at,
  up.full_name as buyer_name,
  up.avatar_url as buyer_avatar,
  up.country as buyer_country,
  o.order_number,
  -- Get first game name from order items
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = sr.order_id LIMIT 1) as game_name
FROM seller_reviews sr
JOIN user_profiles up ON sr.buyer_id = up.id
JOIN orders o ON sr.order_id = o.id;

COMMENT ON VIEW seller_reviews_with_buyer IS 'View for seller reviews with buyer info. Enforces RLS via security_invoker=true.';

-- 5. Fix seller_earnings_summary
DROP VIEW IF EXISTS seller_earnings_summary;
CREATE OR REPLACE VIEW seller_earnings_summary WITH (security_invoker = true) AS
SELECT
  o.seller_id as user_id,
  COUNT(DISTINCT o.id) as total_sales_count,
  COALESCE(SUM(o.items_total + o.shipping_cost), 0) as total_gross,
  COALESCE(SUM(o.service_fee), 0) as total_platform_fees,
  COALESCE(SUM(o.items_total + o.shipping_cost), 0) as total_net,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payout_status = 'completed') as completed_payouts_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payout_status = 'pending') as pending_payouts_count,
  -- Last 30 days stats (using updated_at as completion timestamp)
  COUNT(DISTINCT o.id) FILTER (WHERE o.updated_at >= NOW() - INTERVAL '30 days') as sales_last_30_days,
  COALESCE(SUM(o.items_total + o.shipping_cost) FILTER (WHERE o.updated_at >= NOW() - INTERVAL '30 days'), 0) as earnings_last_30_days
FROM orders o
WHERE o.status = 'completed'
GROUP BY o.seller_id;

COMMENT ON VIEW seller_earnings_summary IS 'Aggregated seller earnings for dashboard display. Enforces RLS via security_invoker=true.';

-- 6. Fix seller_transaction_history
DROP VIEW IF EXISTS seller_transaction_history;
CREATE OR REPLACE VIEW seller_transaction_history WITH (security_invoker = true) AS
-- Sales (orders that are paid/completed)
SELECT
  o.id,
  o.seller_id as user_id,
  'sale' as transaction_type,
  o.order_number as reference,
  o.status,
  o.payout_status,
  (o.items_total + o.shipping_cost) as gross_amount,
  o.service_fee as platform_fee,
  (o.items_total + o.shipping_cost) as net_amount,
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) as description,
  o.created_at,
  o.updated_at as completed_at
FROM orders o
WHERE o.status NOT IN ('pending_payment', 'cancelled')

UNION ALL

-- Bank payouts
SELECT
  sp.id,
  sp.user_id,
  'payout' as transaction_type,
  sp.stripe_payout_id as reference,
  sp.status,
  sp.status as payout_status,
  -sp.amount as gross_amount,
  0 as platform_fee,
  -sp.amount as net_amount, -- Payouts are negative amount in history context
  ('Payout to ' || COALESCE(sp.bank_name, 'Bank') || ' •••• ' || sp.bank_account_last4) as description,
  sp.created_at,
  sp.paid_at as completed_at
FROM seller_payouts sp;

COMMENT ON VIEW seller_transaction_history IS 'Unified view of sales and bank payouts for seller transaction history. Enforces RLS via security_invoker=true.';
