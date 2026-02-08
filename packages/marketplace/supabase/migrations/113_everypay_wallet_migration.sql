-- Migration: 113_everypay_wallet_migration.sql
-- Purpose: Replace Stripe with EveryPay + platform wallet system
-- This is a breaking migration (pre-launch, all data is test data)

-- ============================================================================
-- 1. NEW TABLES
-- ============================================================================

-- Wallet balances (one per user)
CREATE TABLE wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE wallets IS 'Platform wallet balances. Funded by sales, used for purchases and withdrawals.';

-- Wallet transaction ledger
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale_credit', 'purchase_debit', 'withdrawal', 'refund_credit')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  balance_after_cents INTEGER NOT NULL,
  order_id UUID REFERENCES orders(id),
  withdrawal_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_order ON wallet_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(user_id, created_at DESC);

COMMENT ON TABLE wallet_transactions IS 'Immutable ledger of all wallet balance changes.';

-- Withdrawal requests (seller → bank)
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  iban TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  bank_reference TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status) WHERE status = 'pending';
CREATE INDEX idx_withdrawal_requests_created ON withdrawal_requests(created_at DESC);

COMMENT ON TABLE withdrawal_requests IS 'Seller withdrawal requests. Admin manually processes bank transfers.';

-- EveryPay webhook events (idempotency)
CREATE TABLE everypay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference TEXT NOT NULL,
  order_reference TEXT,
  event_type TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_everypay_webhook_payment_ref ON everypay_webhook_events(payment_reference);
CREATE INDEX idx_everypay_webhook_created ON everypay_webhook_events(created_at);

COMMENT ON TABLE everypay_webhook_events IS 'EveryPay callback tracking for idempotent payment processing.';

-- ============================================================================
-- 2. DROP STRIPE-SPECIFIC TABLES
-- ============================================================================

DROP TABLE IF EXISTS stripe_webhook_events CASCADE;
DROP TABLE IF EXISTS payout_transactions CASCADE;
DROP TABLE IF EXISTS seller_payouts CASCADE;

-- ============================================================================
-- 3. MODIFY ORDERS TABLE
-- ============================================================================

-- Drop all views that reference columns being dropped
DROP VIEW IF EXISTS orders_with_participants CASCADE;
DROP VIEW IF EXISTS seller_earnings_summary CASCADE;
DROP VIEW IF EXISTS seller_transaction_history CASCADE;
DROP VIEW IF EXISTS user_profiles_full CASCADE;

-- Drop Stripe-specific indexes
DROP INDEX IF EXISTS idx_orders_payout_eligible;
DROP INDEX IF EXISTS idx_orders_stripe_refund_id;
DROP INDEX IF EXISTS idx_orders_stripe_checkout_session_id;
DROP INDEX IF EXISTS idx_orders_stripe_transfer_group;

-- Drop the total_amount_valid constraint (references service_fee)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS total_amount_valid;

-- Drop payout_status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_status_check;

-- Drop Stripe columns from orders
ALTER TABLE orders
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_charge_id,
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_transfer_group,
  DROP COLUMN IF EXISTS stripe_transfer_id,
  DROP COLUMN IF EXISTS stripe_transfer_amount,
  DROP COLUMN IF EXISTS stripe_refund_id,
  DROP COLUMN IF EXISTS stripe_transfer_reversal_id,
  DROP COLUMN IF EXISTS payout_status,
  DROP COLUMN IF EXISTS transferred_to_seller_at,
  DROP COLUMN IF EXISTS service_fee;

-- Add EveryPay + wallet columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS everypay_payment_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS everypay_payment_state TEXT,
  ADD COLUMN IF NOT EXISTS platform_commission_cents INTEGER,
  ADD COLUMN IF NOT EXISTS seller_wallet_credit_cents INTEGER,
  ADD COLUMN IF NOT EXISTS buyer_wallet_debit_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_credited_at TIMESTAMPTZ;

-- Note: total_amount_valid constraint added at end of migration after data cleanup

-- Index for EveryPay payment reference lookups
CREATE INDEX IF NOT EXISTS idx_orders_everypay_ref
  ON orders(everypay_payment_reference) WHERE everypay_payment_reference IS NOT NULL;

-- Index for pending wallet credits (orders completed but not yet credited)
CREATE INDEX IF NOT EXISTS idx_orders_pending_wallet_credit
  ON orders(status) WHERE status = 'completed' AND wallet_credited_at IS NULL;

COMMENT ON COLUMN orders.everypay_payment_reference IS 'EveryPay payment reference. NULL if paid entirely by wallet.';
COMMENT ON COLUMN orders.everypay_payment_state IS 'EveryPay payment state (settled, failed, etc.)';
COMMENT ON COLUMN orders.platform_commission_cents IS '10% platform commission in cents (set on completion)';
COMMENT ON COLUMN orders.seller_wallet_credit_cents IS 'Amount credited to seller wallet in cents (set on completion)';
COMMENT ON COLUMN orders.buyer_wallet_debit_cents IS 'Amount debited from buyer wallet in cents (0 if no wallet used)';
COMMENT ON COLUMN orders.wallet_credited_at IS 'When seller wallet was credited (on order completion)';

-- ============================================================================
-- 4. MODIFY SELLER_PROFILES TABLE
-- ============================================================================

-- Drop Stripe-specific index
DROP INDEX IF EXISTS idx_seller_profiles_stripe_account;

-- Drop Stripe Connect columns
ALTER TABLE seller_profiles
  DROP COLUMN IF EXISTS stripe_connect_account_id,
  DROP COLUMN IF EXISTS stripe_connect_onboarding_completed,
  DROP COLUMN IF EXISTS stripe_connect_charges_enabled,
  DROP COLUMN IF EXISTS stripe_connect_payouts_enabled,
  DROP COLUMN IF EXISTS stripe_connect_details_submitted,
  DROP COLUMN IF EXISTS stripe_connect_updated_at,
  DROP COLUMN IF EXISTS stripe_requirements,
  DROP COLUMN IF EXISTS stripe_capabilities,
  DROP COLUMN IF EXISTS has_bank_account,
  DROP COLUMN IF EXISTS bank_account_last4,
  DROP COLUMN IF EXISTS bank_account_bank_name;

-- Add IBAN fields (collected before first withdrawal, not at onboarding)
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS payout_iban TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_holder_name TEXT;

COMMENT ON COLUMN seller_profiles.payout_iban IS 'Seller IBAN for bank withdrawals. Collected before first withdrawal.';
COMMENT ON COLUMN seller_profiles.payout_account_holder_name IS 'Account holder name for bank withdrawals.';

-- ============================================================================
-- 5. RECREATE orders_with_participants VIEW (without Stripe refs)
-- ============================================================================

CREATE VIEW orders_with_participants AS
SELECT
  o.*,
  buyer.full_name AS buyer_name,
  buyer.avatar_url AS buyer_avatar,
  buyer.country AS buyer_country,
  seller.full_name AS seller_name,
  seller.avatar_url AS seller_avatar,
  seller.country AS seller_country,
  sp.seller_status AS seller_status
FROM orders o
LEFT JOIN user_profiles buyer ON o.buyer_id = buyer.id
LEFT JOIN user_profiles seller ON o.seller_id = seller.id
LEFT JOIN seller_profiles sp ON o.seller_id = sp.user_id;

COMMENT ON VIEW orders_with_participants IS
  'Orders with pre-joined buyer and seller profile data. Eliminates N+1 queries.';

-- Recreate user_profiles_full without Stripe columns, with IBAN fields
CREATE OR REPLACE VIEW user_profiles_full AS
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
  u.is_staff,
  COALESCE(s.seller_status, 'not_started') AS seller_status,
  s.seller_terms_accepted_at,
  COALESCE(s.seller_terms_version, '1.0') AS seller_terms_version,
  s.payout_iban,
  s.payout_account_holder_name,
  COALESCE(s.dac7_annual_transaction_count, 0) AS dac7_annual_transaction_count,
  COALESCE(s.dac7_annual_sales_total, 0.00) AS dac7_annual_sales_total,
  s.dac7_reporting_year,
  s.dac7_tax_id,
  s.dac7_tax_id_type
FROM user_profiles u
LEFT JOIN seller_profiles s ON u.id = s.user_id;

COMMENT ON VIEW user_profiles_full IS
  'User profiles with seller profile data pre-joined. Replaces Stripe fields with wallet/IBAN fields.';

-- ============================================================================
-- 6. ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================================

-- Wallets: users read own, service role writes
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallets_select_own ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY wallets_service_all ON wallets
  FOR ALL USING (auth.role() = 'service_role');

-- Wallet transactions: users read own, service role writes
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallet_transactions_select_own ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY wallet_transactions_service_all ON wallet_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Withdrawal requests: users CRUD own, staff read all + update
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY withdrawal_requests_select_own ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY withdrawal_requests_insert_own ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY withdrawal_requests_staff_select ON withdrawal_requests
  FOR SELECT USING (is_staff());

CREATE POLICY withdrawal_requests_staff_update ON withdrawal_requests
  FOR UPDATE USING (is_staff());

CREATE POLICY withdrawal_requests_service_all ON withdrawal_requests
  FOR ALL USING (auth.role() = 'service_role');

-- EveryPay webhook events: service role only
ALTER TABLE everypay_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY everypay_webhook_service_all ON everypay_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. AUTO-CREATE WALLET ON USER CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance_cents)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS trigger_create_wallet ON auth.users;
CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();

-- Backfill wallets for existing users
INSERT INTO wallets (user_id, balance_cents)
SELECT id, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 8. RPC: credit_seller_wallet
-- Called when order completes. Atomic: credits wallet + records transaction.
-- ============================================================================

CREATE OR REPLACE FUNCTION credit_seller_wallet(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_items_total_cents INTEGER;
  v_commission_cents INTEGER;
  v_credit_cents INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the order row
  SELECT id, seller_id, items_total, wallet_credited_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.wallet_credited_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet already credited for this order');
  END IF;

  -- Calculate amounts (10% commission)
  v_items_total_cents := ROUND(v_order.items_total * 100);
  v_commission_cents := ROUND(v_items_total_cents * 0.10);
  v_credit_cents := v_items_total_cents - v_commission_cents;

  -- Ensure wallet exists
  INSERT INTO wallets (user_id, balance_cents)
  VALUES (v_order.seller_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Credit wallet
  UPDATE wallets
  SET balance_cents = balance_cents + v_credit_cents,
      updated_at = NOW()
  WHERE user_id = v_order.seller_id
  RETURNING balance_cents INTO v_new_balance;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
  VALUES (
    v_order.seller_id,
    'sale_credit',
    v_credit_cents,
    v_new_balance,
    p_order_id,
    'Sale completed'
  );

  -- Update order
  UPDATE orders
  SET platform_commission_cents = v_commission_cents,
      seller_wallet_credit_cents = v_credit_cents,
      wallet_credited_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'credit_cents', v_credit_cents,
    'commission_cents', v_commission_cents,
    'new_balance_cents', v_new_balance
  );
END;
$$;

-- ============================================================================
-- 9. RPC: debit_buyer_wallet
-- Called during checkout when buyer uses wallet balance.
-- ============================================================================

CREATE OR REPLACE FUNCTION debit_buyer_wallet(
  p_user_id UUID,
  p_amount_cents INTEGER,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_amount_cents <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Ensure wallet exists
  INSERT INTO wallets (user_id, balance_cents)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and check balance
  SELECT balance_cents INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance < p_amount_cents THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Debit wallet
  v_new_balance := v_current_balance - p_amount_cents;
  UPDATE wallets
  SET balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
  VALUES (
    p_user_id,
    'purchase_debit',
    p_amount_cents,
    v_new_balance,
    p_order_id,
    'Purchase payment'
  );

  RETURN json_build_object('success', true, 'new_balance_cents', v_new_balance);
END;
$$;

-- ============================================================================
-- 10. RPC: credit_wallet (generic, for refunds)
-- ============================================================================

CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount_cents INTEGER,
  p_order_id UUID,
  p_description TEXT DEFAULT 'Refund'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount_cents <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Ensure wallet exists
  INSERT INTO wallets (user_id, balance_cents)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Credit wallet
  UPDATE wallets
  SET balance_cents = balance_cents + p_amount_cents,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance_cents INTO v_new_balance;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
  VALUES (
    p_user_id,
    'refund_credit',
    p_amount_cents,
    v_new_balance,
    p_order_id,
    p_description
  );

  RETURN json_build_object('success', true, 'new_balance_cents', v_new_balance);
END;
$$;

-- ============================================================================
-- 11. RPC: create_withdrawal_request
-- Atomic: debits wallet + creates withdrawal record.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_withdrawal_request(
  p_user_id UUID,
  p_amount_cents INTEGER,
  p_iban TEXT,
  p_account_holder_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_withdrawal_id UUID;
BEGIN
  IF p_amount_cents <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Lock and check balance
  SELECT balance_cents INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_current_balance < p_amount_cents THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Debit wallet
  v_new_balance := v_current_balance - p_amount_cents;
  UPDATE wallets
  SET balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create withdrawal request
  INSERT INTO withdrawal_requests (user_id, amount_cents, iban, account_holder_name, status)
  VALUES (p_user_id, p_amount_cents, p_iban, p_account_holder_name, 'pending')
  RETURNING id INTO v_withdrawal_id;

  -- Record wallet transaction
  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, withdrawal_id, description)
  VALUES (
    p_user_id,
    'withdrawal',
    p_amount_cents,
    v_new_balance,
    v_withdrawal_id,
    'Withdrawal request'
  );

  -- Update seller profile IBAN if not already set
  UPDATE seller_profiles
  SET payout_iban = p_iban,
      payout_account_holder_name = p_account_holder_name,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND (payout_iban IS NULL OR payout_iban != p_iban);

  RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id, 'new_balance_cents', v_new_balance);
END;
$$;

-- ============================================================================
-- 12. RPC: reject_withdrawal_request
-- Atomic: rejects request + re-credits wallet.
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_withdrawal_request(
  p_withdrawal_id UUID,
  p_processed_by UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_withdrawal RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Lock the withdrawal request
  SELECT id, user_id, amount_cents, status
  INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Can only reject pending requests');
  END IF;

  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET status = 'rejected',
      processed_by = p_processed_by,
      processed_at = NOW(),
      rejection_reason = p_reason
  WHERE id = p_withdrawal_id;

  -- Re-credit wallet
  UPDATE wallets
  SET balance_cents = balance_cents + v_withdrawal.amount_cents,
      updated_at = NOW()
  WHERE user_id = v_withdrawal.user_id
  RETURNING balance_cents INTO v_new_balance;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, withdrawal_id, description)
  VALUES (
    v_withdrawal.user_id,
    'refund_credit',
    v_withdrawal.amount_cents,
    v_new_balance,
    p_withdrawal_id,
    'Withdrawal rejected: ' || p_reason
  );

  RETURN json_build_object('success', true, 'refunded_cents', v_withdrawal.amount_cents);
END;
$$;

-- ============================================================================
-- 13. UPDATE: create_order_from_basket (EveryPay + wallet)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_order_from_basket(
  p_basket_id UUID,
  p_shipping_method VARCHAR,
  p_destination_country VARCHAR DEFAULT NULL,
  p_destination_terminal_id VARCHAR DEFAULT NULL,
  p_destination_terminal_name VARCHAR DEFAULT NULL,
  p_destination_terminal_address TEXT DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_pickup_notes TEXT DEFAULT NULL,
  p_receiver_name VARCHAR DEFAULT NULL,
  p_receiver_phone VARCHAR DEFAULT NULL,
  p_receiver_email VARCHAR DEFAULT NULL,
  p_shipping_cost DECIMAL DEFAULT 0,
  p_everypay_payment_reference TEXT DEFAULT NULL,
  p_buyer_wallet_debit_cents INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_basket RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_items_total DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
  v_seller_country VARCHAR(2);
  v_new_balance INTEGER;
BEGIN
  SELECT b.*, up.country as seller_country INTO v_basket
  FROM baskets b JOIN user_profiles up ON b.seller_id = up.id
  WHERE b.id = p_basket_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Basket not found');
  END IF;

  v_seller_country := v_basket.seller_country;

  SELECT COALESCE(SUM(l.price), 0) INTO v_items_total
  FROM basket_items bi JOIN listings l ON bi.listing_id = l.id
  WHERE bi.basket_id = p_basket_id;

  IF v_items_total = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Basket is empty');
  END IF;

  v_total_amount := v_items_total + p_shipping_cost;
  v_order_number := generate_order_number();

  -- Debit buyer wallet if applicable
  IF p_buyer_wallet_debit_cents > 0 THEN
    -- Ensure wallet exists
    INSERT INTO wallets (user_id, balance_cents)
    VALUES (v_basket.buyer_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Debit wallet atomically
    UPDATE wallets
    SET balance_cents = balance_cents - p_buyer_wallet_debit_cents,
        updated_at = NOW()
    WHERE user_id = v_basket.buyer_id
      AND balance_cents >= p_buyer_wallet_debit_cents
    RETURNING balance_cents INTO v_new_balance;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
    END IF;
  END IF;

  INSERT INTO orders (
    order_number, buyer_id, seller_id, shipping_method,
    destination_country, destination_terminal_id, destination_terminal_name, destination_terminal_address,
    sender_country, pickup_city, pickup_notes,
    receiver_name, receiver_phone, receiver_email,
    items_total, shipping_cost, total_amount,
    everypay_payment_reference, buyer_wallet_debit_cents,
    paid_at, seller_response_deadline, status
  ) VALUES (
    v_order_number, v_basket.buyer_id, v_basket.seller_id, p_shipping_method,
    p_destination_country, p_destination_terminal_id, p_destination_terminal_name, p_destination_terminal_address,
    v_seller_country, p_pickup_city, p_pickup_notes,
    p_receiver_name, p_receiver_phone, p_receiver_email,
    v_items_total, p_shipping_cost, v_total_amount,
    p_everypay_payment_reference, p_buyer_wallet_debit_cents,
    NOW(), NOW() + INTERVAL '24 hours', 'pending_seller'
  ) RETURNING id INTO v_order_id;

  -- Record wallet transaction if wallet was debited
  IF p_buyer_wallet_debit_cents > 0 THEN
    INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
    VALUES (
      v_basket.buyer_id,
      'purchase_debit',
      p_buyer_wallet_debit_cents,
      v_new_balance,
      v_order_id,
      'Purchase payment'
    );
  END IF;

  INSERT INTO order_items (order_id, listing_id, game_name, bgg_game_id, price, condition, photo_url)
  SELECT v_order_id, l.id, l.game_name, l.bgg_game_id, l.price, l.condition, l.photo_urls[1]
  FROM basket_items bi JOIN listings l ON bi.listing_id = l.id
  WHERE bi.basket_id = p_basket_id;

  UPDATE listings SET status = 'sold', sold_at = NOW(), reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE id IN (SELECT listing_id FROM basket_items WHERE basket_id = p_basket_id);

  DELETE FROM baskets WHERE id = p_basket_id;

  RETURN json_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total_amount', v_total_amount);
END;
$$;

-- ============================================================================
-- 14. UPDATE: complete_delivered_orders (now credits seller wallet)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_delivered_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order RECORD;
  v_count INTEGER := 0;
  v_items_total_cents INTEGER;
  v_commission_cents INTEGER;
  v_credit_cents INTEGER;
  v_new_balance INTEGER;
BEGIN
  FOR v_order IN
    SELECT id, seller_id, items_total
    FROM orders
    WHERE status = 'delivered'
      AND COALESCE(delivered_at, updated_at) < NOW() - INTERVAL '2 days'
      AND wallet_credited_at IS NULL
  LOOP
    -- Calculate amounts (10% commission)
    v_items_total_cents := ROUND(v_order.items_total * 100);
    v_commission_cents := ROUND(v_items_total_cents * 0.10);
    v_credit_cents := v_items_total_cents - v_commission_cents;

    -- Ensure wallet exists
    INSERT INTO wallets (user_id, balance_cents)
    VALUES (v_order.seller_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Credit wallet
    UPDATE wallets
    SET balance_cents = balance_cents + v_credit_cents,
        updated_at = NOW()
    WHERE user_id = v_order.seller_id
    RETURNING balance_cents INTO v_new_balance;

    -- Record transaction
    INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
    VALUES (v_order.seller_id, 'sale_credit', v_credit_cents, v_new_balance, v_order.id, 'Sale completed');

    -- Update order
    UPDATE orders
    SET status = 'completed',
        platform_commission_cents = v_commission_cents,
        seller_wallet_credit_cents = v_credit_cents,
        wallet_credited_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- 15. SET service_fee = 0 on existing orders, then update total_amount
-- (Clean up test data to satisfy the new constraint)
-- ============================================================================

-- Update existing orders: set total_amount = items_total + shipping_cost
UPDATE orders SET total_amount = items_total + shipping_cost WHERE TRUE;

-- Now add the constraint (old one was dropped in section 3)
ALTER TABLE orders ADD CONSTRAINT total_amount_valid
  CHECK (total_amount = items_total + shipping_cost);
