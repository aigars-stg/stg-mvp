-- ============================================================================
-- MIGRATION: Dispute Engine, Tracking Sync Patches, EveryPay Refund Integration
-- DATE: 2026-03-05
-- PRD: STG-PRD-Dispute-Engine-and-Tracking-Sync-v1.0
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix orders status CHECK constraint (add 'refunded')
-- ============================================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending_payment', 'pending_seller', 'accepted', 'shipped',
    'in_transit', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded'
  )
);

-- ============================================================================
-- STEP 2: New columns on orders - shipping deadline
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_deadline TIMESTAMPTZ;
COMMENT ON COLUMN orders.shipping_deadline IS '2 business days (3 calendar days) after seller accepts. Auto-cancel if no tracking event by deadline.';

-- ============================================================================
-- STEP 3: New columns on orders - refund tracking
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR DEFAULT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_refund_status_check CHECK (
  refund_status IS NULL OR refund_status IN (
    'pending', 'processing', 'completed', 'failed', 'manual_sepa_required'
  )
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_everypay_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_sepa_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_method VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_error TEXT;

COMMENT ON COLUMN orders.refund_status IS 'Refund lifecycle: NULL -> pending -> processing -> completed/failed/manual_sepa_required';
COMMENT ON COLUMN orders.refund_method IS 'How refund was processed: everypay_card, everypay_bank_link, manual_sepa, wallet_only, mixed';

-- ============================================================================
-- STEP 4: New columns on orders - payment method tracking
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR;
COMMENT ON COLUMN orders.payment_method IS 'Payment method used at checkout: card, bank_link, wallet_only, mixed. Set at payment callback time.';

-- ============================================================================
-- STEP 5: New columns on orders - Unisend claim tracking
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS unisend_claim_filed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unisend_claim_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unisend_claim_status VARCHAR;
ALTER TABLE orders ADD CONSTRAINT orders_unisend_claim_status_check CHECK (
  unisend_claim_status IS NULL OR unisend_claim_status IN (
    'filed', 'under_review', 'approved', 'denied'
  )
);

COMMENT ON COLUMN orders.unisend_claim_status IS 'Unisend shipping claim status for lost/damaged parcels';

-- ============================================================================
-- STEP 6: New columns on order_issues - return label tracking
-- ============================================================================

ALTER TABLE order_issues ADD COLUMN IF NOT EXISTS return_label_barcode VARCHAR;
ALTER TABLE order_issues ADD COLUMN IF NOT EXISTS return_label_url TEXT;
ALTER TABLE order_issues ADD COLUMN IF NOT EXISTS return_tracking_url TEXT;

COMMENT ON COLUMN order_issues.return_label_barcode IS 'Unisend PRODUCT_RETURN label barcode for buyer returns';

-- ============================================================================
-- STEP 6b: Shipping reminder tracking
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_reminder_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN orders.shipping_reminder_sent_at IS 'When the 24h shipping reminder email was sent to the seller';

-- ============================================================================
-- STEP 7: Indexes for dispute and refund queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_dispute_status
  ON orders (dispute_status)
  WHERE dispute_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_refund_status
  ON orders (refund_status)
  WHERE refund_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shipping_deadline
  ON orders (shipping_deadline)
  WHERE status = 'accepted' AND shipping_deadline IS NOT NULL;

-- ============================================================================
-- STEP 8: Patch seller_accept_order() to set shipping_deadline
-- ============================================================================

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

-- ============================================================================
-- STEP 9: Patch add_tracking_event() - handle in_transit + RETURNED_TO_SENDER
-- Also set delivered_at on delivery
-- ============================================================================

CREATE OR REPLACE FUNCTION add_tracking_event(
  p_order_id UUID,
  p_event_type VARCHAR(50),
  p_state_type VARCHAR(50),
  p_state_text VARCHAR(255),
  p_location VARCHAR(255),
  p_description TEXT,
  p_event_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  INSERT INTO tracking_events (
    order_id,
    event_type,
    state_type,
    state_text,
    location,
    description,
    event_timestamp
  ) VALUES (
    p_order_id,
    p_event_type,
    p_state_type,
    p_state_text,
    p_location,
    p_description,
    p_event_timestamp
  )
  ON CONFLICT (order_id, event_type, event_timestamp) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Update order status based on tracking event
  IF v_inserted THEN
    CASE p_state_type
      WHEN 'PARCEL_RECEIVED' THEN
        -- Seller dropped parcel at origin locker
        UPDATE orders SET status = 'shipped', updated_at = NOW()
        WHERE id = p_order_id AND status = 'accepted';
      WHEN 'ON_THE_WAY' THEN
        -- Parcel in transit between lockers
        UPDATE orders SET status = 'in_transit', updated_at = NOW()
        WHERE id = p_order_id AND status IN ('accepted', 'shipped');
      WHEN 'PARCEL_DELIVERED' THEN
        -- Parcel arrived at destination locker (buyer can now collect)
        UPDATE orders SET
          status = 'delivered',
          delivered_at = NOW(),
          updated_at = NOW()
        WHERE id = p_order_id AND status IN ('shipped', 'in_transit');
      WHEN 'PARCEL_PICKED_UP' THEN
        -- Buyer collected from locker (informational, no status change)
        NULL;
      WHEN 'RETURNED_TO_SENDER' THEN
        -- Buyer didn't collect within 72h, parcel returned
        -- Log the event but don't auto-cancel; admin reviews
        NULL;
      ELSE
        -- No status change for other events
        NULL;
    END CASE;
  END IF;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: Patch report_order_issue() - add dispute validation
-- ============================================================================

CREATE OR REPLACE FUNCTION report_order_issue(
  p_order_id UUID,
  p_reporter_id UUID,
  p_issue_type VARCHAR(50),
  p_description TEXT,
  p_photo_urls TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_reporter_role VARCHAR(10);
  v_issue_id UUID;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Determine reporter role
  IF v_order.buyer_id = p_reporter_id THEN
    v_reporter_role := 'buyer';
  ELSIF v_order.seller_id = p_reporter_id THEN
    v_reporter_role := 'seller';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not authorized to report issues on this order');
  END IF;

  -- Only allow disputes on shipped, in_transit, or delivered orders
  IF v_order.status NOT IN ('shipped', 'in_transit', 'delivered') THEN
    RETURN json_build_object('success', false, 'error',
      'Disputes can only be opened on shipped or delivered orders. Need help? Contact us at info@secondturn.games');
  END IF;

  -- Enforce 2-day inspection window after delivery
  IF v_order.delivered_at IS NOT NULL
     AND v_order.delivered_at < NOW() - INTERVAL '2 days' THEN
    RETURN json_build_object('success', false, 'error',
      'The inspection window for this order has closed. Please contact info@secondturn.games for assistance.');
  END IF;

  -- Check seller wallet hasn't been credited already
  IF v_order.wallet_credited_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error',
      'This order has already been completed. Please contact info@secondturn.games for assistance.');
  END IF;

  -- Check if there's already an open issue from this user
  IF EXISTS (
    SELECT 1 FROM order_issues
    WHERE order_id = p_order_id
      AND reporter_id = p_reporter_id
      AND status = 'open'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You already have an open issue for this order');
  END IF;

  -- Create issue
  INSERT INTO order_issues (
    order_id,
    reporter_id,
    reporter_role,
    issue_type,
    description,
    photo_urls
  ) VALUES (
    p_order_id,
    p_reporter_id,
    v_reporter_role,
    p_issue_type,
    p_description,
    p_photo_urls
  )
  RETURNING id INTO v_issue_id;

  -- Populate dispute fields on the order (buyer disputes only)
  IF v_reporter_role = 'buyer' THEN
    UPDATE orders SET
      status = 'disputed',
      disputed_at = NOW(),
      dispute_reason = p_issue_type,
      dispute_description = p_description,
      dispute_status = 'awaiting_seller',
      dispute_seller_deadline = NOW() + INTERVAL '48 hours',
      updated_at = NOW()
    WHERE id = p_order_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'issue_id', v_issue_id,
    'order_number', v_order.order_number
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 11: New function - escalate_expired_disputes()
-- Cron job to escalate disputes where seller didn't respond in 48h
-- ============================================================================

CREATE OR REPLACE FUNCTION escalate_expired_disputes()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE orders SET
    dispute_status = 'under_review',
    updated_at = NOW()
  WHERE dispute_status = 'awaiting_seller'
    AND dispute_seller_deadline < NOW()
    AND dispute_seller_responded_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION escalate_expired_disputes IS 'Cron job: escalate disputes to under_review when seller deadline passes';

-- ============================================================================
-- STEP 12: Legacy function cleanup
-- Drop unused Stripe-era functions (verified no code references these)
-- ============================================================================

DROP FUNCTION IF EXISTS seller_can_receive_payouts(UUID);
DROP FUNCTION IF EXISTS get_pending_payouts(UUID);
DROP FUNCTION IF EXISTS get_seller_payout_stats(UUID);
