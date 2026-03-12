-- ============================================================================
-- Task 1.1: Add deadline guard to seller_accept_order and seller_decline_order
-- Prevents sellers from acting on expired orders even before the cron runs
-- ============================================================================

-- Recreate seller_accept_order with deadline guard
-- NOTE: This function is NOT SECURITY DEFINER (runs as calling user) — keep as-is
CREATE OR REPLACE FUNCTION seller_accept_order(
  p_order_id UUID,
  p_seller_id UUID,
  p_parcel_size VARCHAR(2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Get and lock order
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending_seller' THEN
    RETURN json_build_object('success', false, 'error', 'Order is not pending seller response');
  END IF;

  -- Deadline guard: reject if seller response deadline has passed
  IF v_order.seller_response_deadline IS NOT NULL AND v_order.seller_response_deadline < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Seller response deadline has expired');
  END IF;

  -- Update order with shipping deadline (3 calendar days as safe approximation of 2 business days)
  UPDATE orders
  SET
    status = 'accepted',
    seller_responded_at = NOW(),
    parcel_size = p_parcel_size,
    shipping_deadline = NOW() + INTERVAL '3 days',
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'shipping_deadline', (NOW() + INTERVAL '3 days')::text
  );
END;
$$ LANGUAGE plpgsql;

-- Recreate seller_decline_order with deadline guard
CREATE OR REPLACE FUNCTION seller_decline_order(
  p_order_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending_seller' THEN
    RETURN json_build_object('success', false, 'error', 'Order is not pending seller response');
  END IF;

  -- Deadline guard: reject if seller response deadline has passed
  IF v_order.seller_response_deadline IS NOT NULL AND v_order.seller_response_deadline < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Seller response deadline has expired');
  END IF;

  -- Update order
  UPDATE orders
  SET
    status = 'cancelled',
    seller_responded_at = NOW(),
    seller_decline_reason = p_reason,
    cancellation_reason = 'Seller declined',
    cancelled_at = NOW(),
    cancelled_by = p_seller_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Mark listings as available again
  UPDATE listings
  SET
    status = 'active',
    sold_at = NULL,
    updated_at = NOW()
  WHERE id IN (SELECT listing_id FROM order_items WHERE order_id = p_order_id);

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'requires_refund', true,
    'refund_amount', v_order.total_amount,
    'everypay_payment_reference', v_order.everypay_payment_reference
  );
END;
$$ LANGUAGE plpgsql;
