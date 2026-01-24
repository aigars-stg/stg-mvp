-- Add Stripe Connect support for seller payouts
-- Sellers can connect their Stripe accounts to receive automated payouts

-- ============================================
-- STEP 1: Add Stripe Connect fields to user_profiles
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN stripe_connect_account_id VARCHAR(255),
ADD COLUMN stripe_connect_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_connect_details_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_connect_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_stripe_connect ON user_profiles(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- ============================================
-- STEP 2: Add payout tracking to orders table
-- ============================================

-- Note: stripe_transfer_id already exists from migration 029
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_transfer_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS transferred_to_seller_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) DEFAULT 'pending';

-- Add constraint if not exists
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_payout_status_check
    CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed', 'on_hold'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_payout_status ON orders(payout_status)
  WHERE payout_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_stripe_transfer ON orders(stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;

-- ============================================
-- STEP 3: Create payout_transactions table
-- ============================================

-- Track all payout attempts for audit trail
CREATE TABLE payout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Stripe details
  stripe_transfer_id VARCHAR(255),
  stripe_connect_account_id VARCHAR(255) NOT NULL,

  -- Amounts (in EUR)
  gross_amount DECIMAL(10,2) NOT NULL, -- Total order amount (items + shipping)
  platform_fee DECIMAL(10,2) NOT NULL, -- Platform service fee
  net_amount DECIMAL(10,2) NOT NULL,   -- Amount transferred to seller

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'reversed'
  )),

  -- Error tracking
  error_code VARCHAR(100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payout_transactions_order ON payout_transactions(order_id);
CREATE INDEX idx_payout_transactions_seller ON payout_transactions(seller_id);
CREATE INDEX idx_payout_transactions_status ON payout_transactions(status)
  WHERE status IN ('pending', 'processing');
CREATE INDEX idx_payout_transactions_created ON payout_transactions(created_at DESC);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies
-- ============================================

-- Sellers can view their own payout transactions
CREATE POLICY "Sellers can view their payouts"
  ON payout_transactions
  FOR SELECT
  USING (auth.uid() = seller_id);

-- System creates payout transactions (via service role)
-- No direct INSERT policy for users

-- ============================================
-- STEP 6: Triggers
-- ============================================

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION update_payout_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payout_transactions_updated_at
  BEFORE UPDATE ON payout_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_transactions_updated_at();

-- ============================================
-- STEP 7: Helper Functions
-- ============================================

-- Check if seller can receive payouts
CREATE OR REPLACE FUNCTION seller_can_receive_payouts(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT
    stripe_connect_account_id,
    stripe_connect_onboarding_completed,
    stripe_connect_charges_enabled,
    stripe_connect_payouts_enabled
  INTO v_profile
  FROM user_profiles
  WHERE id = p_seller_id;

  RETURN (
    v_profile.stripe_connect_account_id IS NOT NULL AND
    v_profile.stripe_connect_onboarding_completed = TRUE AND
    v_profile.stripe_connect_payouts_enabled = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get pending payouts for a seller
CREATE OR REPLACE FUNCTION get_pending_payouts(p_seller_id UUID)
RETURNS TABLE (
  order_id UUID,
  order_number VARCHAR(20),
  gross_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    (o.items_total + o.shipping_cost) as gross_amount,
    o.service_fee as platform_fee,
    (o.items_total + o.shipping_cost) as net_amount,
    o.updated_at
  FROM orders o
  WHERE o.seller_id = p_seller_id
    AND o.status = 'completed'
    AND o.payout_status = 'pending'
  ORDER BY o.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STEP 8: Comments
-- ============================================

COMMENT ON COLUMN user_profiles.stripe_connect_account_id IS 'Stripe Connect Express account ID for seller payouts';
COMMENT ON COLUMN user_profiles.stripe_connect_onboarding_completed IS 'Whether seller completed Stripe onboarding';
COMMENT ON COLUMN user_profiles.stripe_connect_charges_enabled IS 'Whether Connect account can accept charges';
COMMENT ON COLUMN user_profiles.stripe_connect_payouts_enabled IS 'Whether Connect account can receive payouts';

COMMENT ON COLUMN orders.payout_status IS 'Status of payout to seller: pending, processing, completed, failed, on_hold';
COMMENT ON COLUMN orders.stripe_transfer_id IS 'Stripe Transfer ID for payout to seller';

COMMENT ON TABLE payout_transactions IS 'Audit trail of all payout attempts to sellers via Stripe Connect';
COMMENT ON FUNCTION seller_can_receive_payouts IS 'Check if seller has completed Stripe Connect onboarding';
COMMENT ON FUNCTION get_pending_payouts IS 'Get all completed orders awaiting payout for a seller';
