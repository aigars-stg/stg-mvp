-- ============================================================================
-- Document System: sequences, generator functions, platform_documents table,
-- invoice_number on orders, updated credit_seller_wallet RPC
-- ============================================================================

-- ============================================================================
-- 1. SEQUENCES
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS commission_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payout_statement_seq START 1;
CREATE SEQUENCE IF NOT EXISTS credit_note_seq START 1;

-- ============================================================================
-- 2. GENERATOR FUNCTIONS (following generate_order_number pattern)
-- ============================================================================

-- COM-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_commission_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  v_seq := nextval('commission_invoice_seq');
  RETURN 'COM-' || v_year || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

-- PO-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_payout_statement_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  v_seq := nextval('payout_statement_seq');
  RETURN 'PO-' || v_year || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

-- CN-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  v_seq := nextval('credit_note_seq');
  RETURN 'CN-' || v_year || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

-- ============================================================================
-- 3. PLATFORM_DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE platform_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('commission_invoice', 'payout_statement', 'credit_note')),
  document_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
  withdrawal_id UUID REFERENCES withdrawal_requests(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  original_document_id UUID REFERENCES platform_documents(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_platform_documents_order ON platform_documents(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_platform_documents_withdrawal ON platform_documents(withdrawal_id) WHERE withdrawal_id IS NOT NULL;
CREATE INDEX idx_platform_documents_seller ON platform_documents(seller_id);
CREATE INDEX idx_platform_documents_type ON platform_documents(document_type);

-- RLS: sellers see own documents, staff sees all
ALTER TABLE platform_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own documents"
  ON platform_documents FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Service role full access"
  ON platform_documents FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. ADD invoice_number TO ORDERS
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- ============================================================================
-- 5. UPDATED credit_seller_wallet RPC
-- Atomically: credit wallet + generate invoice number + create document record
-- ============================================================================

CREATE OR REPLACE FUNCTION credit_seller_wallet(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_commission_cents INTEGER;
  v_credit_cents INTEGER;
  v_new_balance INTEGER;
  v_invoice_number TEXT;
BEGIN
  SELECT id, seller_id, order_number, items_total, shipping_cost, total_amount,
         platform_commission_cents, seller_wallet_credit_cents,
         commission_net_cents, commission_vat_cents, commission_vat_rate,
         shipping_net_cents, shipping_vat_cents, shipping_vat_rate,
         wallet_credited_at, sender_country
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

  -- Read commission from order (set at checkout) instead of recalculating
  IF v_order.seller_wallet_credit_cents IS NOT NULL AND v_order.platform_commission_cents IS NOT NULL THEN
    v_commission_cents := v_order.platform_commission_cents;
    v_credit_cents := v_order.seller_wallet_credit_cents;
  ELSE
    -- Legacy fallback for pre-migration orders
    v_commission_cents := ROUND(ROUND(v_order.items_total * 100) * 0.10);
    v_credit_cents := ROUND(v_order.items_total * 100) - v_commission_cents;
  END IF;

  INSERT INTO wallets (user_id, balance_cents)
  VALUES (v_order.seller_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets
  SET balance_cents = balance_cents + v_credit_cents,
      updated_at = NOW()
  WHERE user_id = v_order.seller_id
  RETURNING balance_cents INTO v_new_balance;

  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
  VALUES (
    v_order.seller_id,
    'sale_credit',
    v_credit_cents,
    v_new_balance,
    p_order_id,
    'Sale completed'
  );

  -- Generate invoice number and create document record
  v_invoice_number := generate_commission_invoice_number();

  INSERT INTO platform_documents (
    document_type,
    document_number,
    order_id,
    seller_id,
    data
  ) VALUES (
    'commission_invoice',
    v_invoice_number,
    p_order_id,
    v_order.seller_id,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'items_total', v_order.items_total,
      'shipping_cost', v_order.shipping_cost,
      'total_amount', v_order.total_amount,
      'commission_gross_cents', v_commission_cents,
      'commission_net_cents', v_order.commission_net_cents,
      'commission_vat_cents', v_order.commission_vat_cents,
      'commission_vat_rate', v_order.commission_vat_rate,
      'shipping_net_cents', v_order.shipping_net_cents,
      'shipping_vat_cents', v_order.shipping_vat_cents,
      'shipping_vat_rate', v_order.shipping_vat_rate,
      'seller_credit_cents', v_credit_cents,
      'sender_country', v_order.sender_country,
      'created_at', NOW()
    )
  );

  -- Update order with invoice number and wallet credit timestamp
  UPDATE orders
  SET invoice_number = v_invoice_number,
      wallet_credited_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'credit_cents', v_credit_cents,
    'commission_cents', v_commission_cents,
    'new_balance_cents', v_new_balance,
    'invoice_number', v_invoice_number
  );
END;
$$;
