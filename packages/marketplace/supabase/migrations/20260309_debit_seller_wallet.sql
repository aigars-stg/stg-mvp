-- ============================================================================
-- Migration: debit_seller_wallet RPC
-- Purpose: Atomic wallet deduction for post-completion refunds (credit note flow)
-- ============================================================================

-- Add refund_clawback to allowed wallet transaction types
ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY['sale_credit', 'purchase_debit', 'withdrawal', 'refund_credit', 'refund_clawback']));

-- Debit seller wallet when reversing a completed order (post-completion refund).
-- Atomically locks the wallet, checks balance, deducts amount, and records transaction.
-- If balance is insufficient, returns an error for manual resolution.
CREATE OR REPLACE FUNCTION debit_seller_wallet(
  p_order_id UUID,
  p_amount_cents INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Get order details
  SELECT id, seller_id, order_number, wallet_credited_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.wallet_credited_at IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order wallet was never credited');
  END IF;

  -- Lock wallet row
  SELECT user_id, balance_cents
  INTO v_wallet
  FROM wallets
  WHERE user_id = v_order.seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Seller wallet not found');
  END IF;

  -- Check sufficient balance
  IF v_wallet.balance_cents < p_amount_cents THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient wallet balance',
      'available_cents', v_wallet.balance_cents,
      'required_cents', p_amount_cents
    );
  END IF;

  -- Deduct from wallet
  UPDATE wallets
  SET balance_cents = balance_cents - p_amount_cents,
      updated_at = NOW()
  WHERE user_id = v_order.seller_id
  RETURNING balance_cents INTO v_new_balance;

  -- Record wallet transaction (amount stored as positive; type indicates direction)
  INSERT INTO wallet_transactions (
    user_id, type, amount_cents, balance_after_cents, order_id, description
  ) VALUES (
    v_order.seller_id,
    'refund_clawback',
    p_amount_cents,
    v_new_balance,
    p_order_id,
    'Post-completion refund clawback for order ' || v_order.order_number
  );

  -- Clear wallet_credited_at on the order
  UPDATE orders
  SET wallet_credited_at = NULL,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'debited_cents', p_amount_cents,
    'new_balance_cents', v_new_balance
  );
END;
$$;
