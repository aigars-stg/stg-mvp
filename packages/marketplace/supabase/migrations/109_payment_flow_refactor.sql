-- Payment Flow Refactor: Separate charges with delayed transfers
-- This migration adds columns and updates functions to support:
-- 1. Tracking delivery timestamp for 2-day dispute window
-- 2. Storing stripe_charge_id for source_transaction in transfers
-- 3. Dispute handling columns
-- 4. Refund tracking

-- Add new columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dispute_description TEXT,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution VARCHAR(50),
  ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Update status check constraint to include 'disputed' and 'refunded'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_seller', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed', 'refunded'));

-- Update payout_status check constraint to include 'not_applicable'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payout_status_check
  CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed', 'on_hold', 'not_applicable'));

-- Update create_order_from_basket to accept and store stripe_charge_id
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
  p_service_fee DECIMAL DEFAULT 0,
  p_stripe_payment_intent_id VARCHAR DEFAULT NULL,
  p_stripe_charge_id VARCHAR DEFAULT NULL
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

  v_total_amount := v_items_total + p_shipping_cost + p_service_fee;
  v_order_number := generate_order_number();

  INSERT INTO orders (
    order_number, buyer_id, seller_id, shipping_method,
    destination_country, destination_terminal_id, destination_terminal_name, destination_terminal_address,
    sender_country, pickup_city, pickup_notes,
    receiver_name, receiver_phone, receiver_email,
    items_total, shipping_cost, service_fee, total_amount,
    stripe_payment_intent_id, stripe_charge_id, paid_at, seller_response_deadline, status
  ) VALUES (
    v_order_number, v_basket.buyer_id, v_basket.seller_id, p_shipping_method,
    p_destination_country, p_destination_terminal_id, p_destination_terminal_name, p_destination_terminal_address,
    v_seller_country, p_pickup_city, p_pickup_notes,
    p_receiver_name, p_receiver_phone, p_receiver_email,
    v_items_total, p_shipping_cost, p_service_fee, v_total_amount,
    p_stripe_payment_intent_id, p_stripe_charge_id, NOW(), NOW() + INTERVAL '24 hours', 'pending_seller'
  ) RETURNING id INTO v_order_id;

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

-- Update complete_delivered_orders to use 2-day window and delivered_at timestamp
CREATE OR REPLACE FUNCTION complete_delivered_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Complete orders that:
  -- 1. Are in 'delivered' status
  -- 2. Were delivered more than 2 days ago (using delivered_at if set, otherwise updated_at)
  -- 3. Are not disputed
  UPDATE orders
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'delivered'
    AND COALESCE(delivered_at, updated_at) < NOW() - INTERVAL '2 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Add index for efficient payout queries
CREATE INDEX IF NOT EXISTS idx_orders_payout_eligible
  ON orders (status, payout_status)
  WHERE status = 'completed' AND payout_status = 'pending';

-- Add index for dispute window queries
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
  ON orders (delivered_at)
  WHERE status = 'delivered';
