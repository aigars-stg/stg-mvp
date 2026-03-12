-- ============================================================================
-- Task 1.7: Create handle_expired_shipping_deadlines() function
-- Cancels accepted orders where the seller did not ship before the deadline
-- EveryPay refunds are handled by the refund safety net (cron-refund-safety-net)
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_expired_shipping_deadlines()
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_cancelled_count INTEGER := 0;
  v_refunds_needed JSON[];
  v_has_tracking BOOLEAN;
  v_everypay_portion_cents INTEGER;
BEGIN
  FOR v_order IN
    SELECT id, order_number, buyer_id, seller_id, total_amount,
           everypay_payment_reference, buyer_wallet_debit_cents
    FROM orders
    WHERE status = 'accepted'
      AND shipping_deadline IS NOT NULL
      AND shipping_deadline < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Skip if there are tracking events (seller did ship, just late)
    SELECT EXISTS(
      SELECT 1 FROM tracking_events WHERE order_id = v_order.id LIMIT 1
    ) INTO v_has_tracking;

    IF v_has_tracking THEN
      CONTINUE;
    END IF;

    -- Cancel order
    UPDATE orders
    SET
      status = 'cancelled',
      cancellation_reason = 'Seller did not ship within the shipping deadline',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_order.id;

    -- Relist items
    UPDATE listings
    SET status = 'active', sold_at = NULL, updated_at = NOW()
    WHERE id IN (SELECT listing_id FROM order_items WHERE order_id = v_order.id);

    -- Wallet refund via existing RPC (handles wallet creation + transaction record)
    IF COALESCE(v_order.buyer_wallet_debit_cents, 0) > 0 THEN
      PERFORM credit_wallet(
        v_order.buyer_id,
        v_order.buyer_wallet_debit_cents,
        v_order.id,
        'Refund — seller did not ship in time'
      );
    END IF;

    -- System message via existing RPC (handles conversation lookup)
    PERFORM post_transaction_system_message(
      v_order.id,
      'order_cancelled',
      'Order automatically cancelled: seller did not ship within the deadline. Your payment will be refunded.'
    );

    -- In-app notification to buyer
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_order.buyer_id,
      'order_cancelled',
      'Order #' || v_order.order_number || ' cancelled',
      'The seller did not ship in time. Your refund is being processed.',
      jsonb_build_object('order_id', v_order.id)
    );

    v_cancelled_count := v_cancelled_count + 1;

    -- Track EveryPay refund needed (processed by refund safety net)
    v_everypay_portion_cents := ROUND(v_order.total_amount * 100) - COALESCE(v_order.buyer_wallet_debit_cents, 0);
    IF v_order.everypay_payment_reference IS NOT NULL AND v_everypay_portion_cents > 0 THEN
      v_refunds_needed := array_append(v_refunds_needed, json_build_object(
        'order_id', v_order.id,
        'buyer_id', v_order.buyer_id,
        'everypay_payment_reference', v_order.everypay_payment_reference,
        'everypay_portion_cents', v_everypay_portion_cents
      ));
    END IF;
  END LOOP;

  RETURN json_build_object(
    'cancelled_count', v_cancelled_count,
    'refunds_needed', v_refunds_needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
