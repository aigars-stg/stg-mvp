-- Add seller dashboard fields for balance display, bank payouts, and transaction history
-- Extends the existing Stripe Connect integration from migrations 036 and 037

-- ============================================
-- STEP 1: Add bank account display fields to user_profiles
-- ============================================

-- Note: Actual bank account (IBAN) is stored only in Stripe
-- We only store display info for the UI

ALTER TABLE user_profiles
ADD COLUMN has_bank_account BOOLEAN DEFAULT FALSE,
ADD COLUMN bank_account_last4 VARCHAR(4),
ADD COLUMN bank_account_bank_name VARCHAR(100);

-- ============================================
-- STEP 2: Add Stripe requirements/capabilities cache
-- ============================================

-- Cache Stripe's requirements and capabilities for UI display
-- Updated via webhooks when account status changes

ALTER TABLE user_profiles
ADD COLUMN stripe_requirements JSONB DEFAULT '{}',
ADD COLUMN stripe_capabilities JSONB DEFAULT '{}';

-- ============================================
-- STEP 3: Create seller_payouts table
-- ============================================

-- Tracks payouts from seller's Stripe balance to their bank account
-- Different from payout_transactions which tracks platform → seller balance transfers

CREATE TABLE seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe payout reference
  stripe_payout_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_connect_account_id VARCHAR(255) NOT NULL,

  -- Payout details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'eur',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Bank account snapshot at time of payout
  bank_account_last4 VARCHAR(4),
  bank_name VARCHAR(100),

  -- Timing
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  arrival_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Error handling
  failure_code VARCHAR(100),
  failure_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT seller_payouts_status_check CHECK (
    status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')
  ),

  CONSTRAINT seller_payouts_amount_positive CHECK (amount > 0)
);

-- ============================================
-- STEP 4: Create indexes for seller_payouts
-- ============================================

CREATE INDEX idx_seller_payouts_user_id ON seller_payouts(user_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status)
  WHERE status IN ('pending', 'in_transit');
CREATE INDEX idx_seller_payouts_created ON seller_payouts(created_at DESC);

-- ============================================
-- STEP 5: Enable RLS on seller_payouts
-- ============================================

ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own payouts
CREATE POLICY "Users can view own payouts"
  ON seller_payouts FOR SELECT
  USING (auth.uid() = user_id);

-- System creates payouts (via service role)
-- No direct INSERT policy for users

-- ============================================
-- STEP 6: Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_seller_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_payouts_updated_at
  BEFORE UPDATE ON seller_payouts
  FOR EACH ROW EXECUTE FUNCTION update_seller_payouts_updated_at();

-- ============================================
-- STEP 7: Create seller_earnings_summary view
-- ============================================

-- Aggregates seller's earnings for dashboard display
-- Note: Using updated_at as proxy for completion time (updated when status changes to 'completed')
CREATE OR REPLACE VIEW seller_earnings_summary AS
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

-- ============================================
-- STEP 8: Create seller_transaction_history view
-- ============================================

-- Unified view of sales and bank payouts for transaction history
CREATE OR REPLACE VIEW seller_transaction_history AS
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
  -sp.amount as net_amount,
  CONCAT('Payout to ****', sp.bank_account_last4) as description,
  sp.created_at,
  sp.paid_at as completed_at
FROM seller_payouts sp;

-- ============================================
-- STEP 9: Helper function to get seller balance info
-- ============================================

-- Get seller's bank payout history stats
CREATE OR REPLACE FUNCTION get_seller_payout_stats(p_seller_id UUID)
RETURNS TABLE (
  total_withdrawn DECIMAL(10,2),
  pending_payout_amount DECIMAL(10,2),
  last_payout_date TIMESTAMP WITH TIME ZONE,
  payout_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'paid'), 0) as total_withdrawn,
    COALESCE(SUM(sp.amount) FILTER (WHERE sp.status IN ('pending', 'in_transit')), 0) as pending_payout_amount,
    MAX(sp.paid_at) as last_payout_date,
    COUNT(*)::INTEGER as payout_count
  FROM seller_payouts sp
  WHERE sp.user_id = p_seller_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STEP 10: Comments
-- ============================================

COMMENT ON COLUMN user_profiles.has_bank_account IS 'Whether seller has added a bank account for payouts';
COMMENT ON COLUMN user_profiles.bank_account_last4 IS 'Last 4 digits of bank account (for display only)';
COMMENT ON COLUMN user_profiles.bank_account_bank_name IS 'Bank name (for display only)';
COMMENT ON COLUMN user_profiles.stripe_requirements IS 'Cached Stripe account requirements (synced via webhooks)';
COMMENT ON COLUMN user_profiles.stripe_capabilities IS 'Cached Stripe account capabilities (synced via webhooks)';

COMMENT ON TABLE seller_payouts IS 'Tracks bank payouts from seller Stripe balance to their bank account';
COMMENT ON VIEW seller_earnings_summary IS 'Aggregated seller earnings for dashboard display';
COMMENT ON VIEW seller_transaction_history IS 'Unified view of sales and bank payouts for seller transaction history';
COMMENT ON FUNCTION get_seller_payout_stats IS 'Get seller bank payout statistics';
