-- Migration: Fix seller earnings views to show items_total only (not shipping)
-- Description: Sellers only receive items_total. Shipping goes to platform.
--              These views were incorrectly showing items_total + shipping_cost.

-- ============================================================================
-- STEP 1: Recreate seller_earnings_summary view with correct calculation
-- ============================================================================

CREATE OR REPLACE VIEW seller_earnings_summary AS
SELECT
  o.seller_id as user_id,
  COUNT(DISTINCT o.id) as total_sales_count,
  -- Seller earns items_total only (shipping goes to platform)
  COALESCE(SUM(o.items_total), 0) as total_gross,
  COALESCE(SUM(o.service_fee), 0) as total_platform_fees,
  COALESCE(SUM(o.items_total), 0) as total_net,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payout_status = 'completed') as completed_payouts_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payout_status = 'pending') as pending_payouts_count,
  -- Last 30 days stats
  COUNT(DISTINCT o.id) FILTER (WHERE o.updated_at >= NOW() - INTERVAL '30 days') as sales_last_30_days,
  COALESCE(SUM(o.items_total) FILTER (WHERE o.updated_at >= NOW() - INTERVAL '30 days'), 0) as earnings_last_30_days
FROM orders o
WHERE o.status IN ('delivered', 'completed')  -- Include delivered orders too
GROUP BY o.seller_id;

COMMENT ON VIEW seller_earnings_summary IS 'Aggregates seller earnings for dashboard. Shows items_total only (seller revenue), not shipping (platform revenue).';

-- ============================================================================
-- STEP 2: Recreate seller_transaction_history view with correct amounts
-- ============================================================================

CREATE OR REPLACE VIEW seller_transaction_history AS
-- Sales (orders that are paid/completed)
SELECT
  o.id,
  o.seller_id as user_id,
  'sale' as transaction_type,
  o.order_number as reference,
  o.status,
  o.payout_status,
  -- Seller receives items_total only (not shipping)
  o.items_total as gross_amount,
  o.service_fee as platform_fee,
  o.items_total as net_amount,
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) as description,
  o.created_at,
  o.updated_at as completed_at
FROM orders o
WHERE o.status NOT IN ('pending_payment', 'cancelled')

UNION ALL

-- Bank payouts (shown as negative amounts - money leaving seller account)
SELECT
  sp.id,
  sp.user_id,
  'payout' as transaction_type,
  sp.stripe_payout_id as reference,
  sp.status,
  sp.status as payout_status,
  -sp.amount as gross_amount,
  0 as platform_fee,
  -sp.amount as net_amount,
  CONCAT('Payout to ****', sp.bank_account_last4) as description,
  sp.created_at,
  sp.paid_at as completed_at
FROM seller_payouts sp;

COMMENT ON VIEW seller_transaction_history IS 'Transaction history for sellers showing correct earnings (items_total only, not shipping).';
