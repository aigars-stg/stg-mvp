-- Create orders system for checkout flow
-- Orders are created after successful payment

-- ============================================
-- STEP 1: Create orders table
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable order number (e.g., "ORD-2024-001234")
  order_number VARCHAR(20) UNIQUE NOT NULL,

  -- Participants
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- ============================================
  -- Shipping Information (captured at checkout)
  -- ============================================

  -- Shipping method: 't2t' (terminal-to-terminal) or 'local_pickup'
  shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('t2t', 'local_pickup')),

  -- For T2T shipping
  destination_country VARCHAR(2), -- LT, LV, EE
  destination_terminal_id VARCHAR(20),
  destination_terminal_name VARCHAR(255),
  destination_terminal_address TEXT,
  sender_country VARCHAR(2), -- Seller's country

  -- For local pickup
  pickup_city TEXT,
  pickup_notes TEXT,

  -- Receiver contact (for T2T)
  receiver_name VARCHAR(255),
  receiver_phone VARCHAR(20),
  receiver_email VARCHAR(255),

  -- ============================================
  -- Pricing (all in EUR)
  -- ============================================

  items_total DECIMAL(10,2) NOT NULL, -- Sum of item prices
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0, -- Shipping fee
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0, -- Platform fee
  total_amount DECIMAL(10,2) NOT NULL, -- Grand total

  -- ============================================
  -- Payment Information (Stripe)
  -- ============================================

  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255), -- Transfer to seller
  paid_at TIMESTAMP WITH TIME ZONE,

  -- ============================================
  -- Seller Response (24h deadline)
  -- ============================================

  seller_response_deadline TIMESTAMP WITH TIME ZONE, -- paid_at + 24 hours
  seller_responded_at TIMESTAMP WITH TIME ZONE,
  seller_decline_reason TEXT,

  -- Parcel size chosen by seller when accepting (for T2T)
  parcel_size VARCHAR(2) CHECK (parcel_size IN ('XS', 'S', 'M', 'L')),

  -- ============================================
  -- Unisend Data (populated when seller accepts T2T order)
  -- ============================================

  unisend_parcel_id BIGINT,
  unisend_request_id VARCHAR(255),
  barcode VARCHAR(50),
  tracking_url TEXT,
  label_url TEXT, -- Stored label PDF URL
  label_generated_at TIMESTAMP WITH TIME ZONE,

  -- ============================================
  -- Order Status
  -- ============================================

  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', -- Created, awaiting payment
    'pending_seller', -- Paid, waiting for seller response (24h)
    'accepted', -- Seller accepted, label generated (for T2T)
    'shipped', -- Seller dropped at terminal / buyer picked up locally
    'in_transit', -- Package in transit (T2T only)
    'delivered', -- Buyer received package
    'completed', -- Order fully completed
    'cancelled', -- Cancelled (timeout, decline, or refund)
    'disputed' -- Issue reported
  )),

  -- Reason for cancellation if applicable
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),

  -- Refund information
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_amount DECIMAL(10,2),

  -- ============================================
  -- Timestamps
  -- ============================================

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ============================================
  -- Constraints
  -- ============================================

  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id),
  CONSTRAINT total_amount_valid CHECK (total_amount = items_total + shipping_cost + service_fee),
  CONSTRAINT t2t_has_shipping_info CHECK (
    shipping_method != 't2t' OR (
      destination_country IS NOT NULL AND
      destination_terminal_id IS NOT NULL AND
      receiver_name IS NOT NULL AND
      receiver_phone IS NOT NULL
    )
  ),
  CONSTRAINT local_pickup_has_city CHECK (
    shipping_method != 'local_pickup' OR pickup_city IS NOT NULL
  )
);

-- ============================================
-- STEP 2: Create order_items table
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,

  -- Snapshot of listing data at purchase time
  game_name TEXT NOT NULL,
  game_bgg_id INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  condition TEXT NOT NULL,
  photo_url TEXT, -- First photo URL

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_seller_deadline ON orders(seller_response_deadline)
  WHERE status = 'pending_seller';
CREATE INDEX idx_orders_barcode ON orders(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_listing ON order_items(listing_id);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies for orders
-- ============================================

-- Buyers can view their orders
CREATE POLICY "Buyers can view their orders"
  ON orders
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view orders for their listings
CREATE POLICY "Sellers can view their orders"
  ON orders
  FOR SELECT
  USING (auth.uid() = seller_id);

-- System creates orders (via service role or function)
-- No direct INSERT policy for users

-- Sellers can update orders they need to respond to
CREATE POLICY "Sellers can respond to orders"
  ON orders
  FOR UPDATE
  USING (auth.uid() = seller_id AND status = 'pending_seller')
  WITH CHECK (auth.uid() = seller_id);

-- ============================================
-- STEP 6: RLS Policies for order_items
-- ============================================

-- Participants can view order items
CREATE POLICY "Order participants can view items"
  ON order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- ============================================
-- STEP 7: Triggers
-- ============================================

-- Update updated_at on order changes
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- STEP 8: Sequence for order numbers
-- ============================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  v_seq := nextval('order_number_seq');
  RETURN 'ORD-' || v_year || '-' || lpad(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 9: Helper functions
-- ============================================

-- Create order from basket after payment
CREATE OR REPLACE FUNCTION create_order_from_basket(
  p_basket_id UUID,
  p_shipping_method VARCHAR(20),
  p_destination_country VARCHAR(2) DEFAULT NULL,
  p_destination_terminal_id VARCHAR(20) DEFAULT NULL,
  p_destination_terminal_name VARCHAR(255) DEFAULT NULL,
  p_destination_terminal_address TEXT DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_pickup_notes TEXT DEFAULT NULL,
  p_receiver_name VARCHAR(255) DEFAULT NULL,
  p_receiver_phone VARCHAR(20) DEFAULT NULL,
  p_receiver_email VARCHAR(255) DEFAULT NULL,
  p_shipping_cost DECIMAL(10,2) DEFAULT 0,
  p_service_fee DECIMAL(10,2) DEFAULT 0,
  p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_basket RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_items_total DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
  v_seller_country VARCHAR(2);
BEGIN
  -- Get basket info
  SELECT b.*, up.country as seller_country
  INTO v_basket
  FROM baskets b
  JOIN user_profiles up ON b.seller_id = up.id
  WHERE b.id = p_basket_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Basket not found');
  END IF;

  v_seller_country := v_basket.seller_country;

  -- Calculate items total
  SELECT COALESCE(SUM(l.price), 0)
  INTO v_items_total
  FROM basket_items bi
  JOIN listings l ON bi.listing_id = l.id
  WHERE bi.basket_id = p_basket_id;

  IF v_items_total = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Basket is empty');
  END IF;

  -- Calculate total
  v_total_amount := v_items_total + p_shipping_cost + p_service_fee;

  -- Generate order number
  v_order_number := generate_order_number();

  -- Create order
  INSERT INTO orders (
    order_number,
    buyer_id,
    seller_id,
    shipping_method,
    destination_country,
    destination_terminal_id,
    destination_terminal_name,
    destination_terminal_address,
    sender_country,
    pickup_city,
    pickup_notes,
    receiver_name,
    receiver_phone,
    receiver_email,
    items_total,
    shipping_cost,
    service_fee,
    total_amount,
    stripe_payment_intent_id,
    paid_at,
    seller_response_deadline,
    status
  ) VALUES (
    v_order_number,
    v_basket.buyer_id,
    v_basket.seller_id,
    p_shipping_method,
    p_destination_country,
    p_destination_terminal_id,
    p_destination_terminal_name,
    p_destination_terminal_address,
    v_seller_country,
    p_pickup_city,
    p_pickup_notes,
    p_receiver_name,
    p_receiver_phone,
    p_receiver_email,
    v_items_total,
    p_shipping_cost,
    p_service_fee,
    v_total_amount,
    p_stripe_payment_intent_id,
    NOW(),
    NOW() + INTERVAL '24 hours',
    'pending_seller'
  )
  RETURNING id INTO v_order_id;

  -- Copy items from basket to order
  INSERT INTO order_items (order_id, listing_id, game_name, game_bgg_id, price, condition, photo_url)
  SELECT
    v_order_id,
    l.id,
    l.game_name,
    l.bgg_game_id,
    l.price,
    l.condition,
    l.photo_urls[1]
  FROM basket_items bi
  JOIN listings l ON bi.listing_id = l.id
  WHERE bi.basket_id = p_basket_id;

  -- Mark listings as sold
  UPDATE listings
  SET
    status = 'sold',
    sold_at = NOW(),
    reserved_by = NULL,
    reserved_until = NULL,
    updated_at = NOW()
  WHERE id IN (SELECT listing_id FROM basket_items WHERE basket_id = p_basket_id);

  -- Delete basket (items will cascade)
  DELETE FROM baskets WHERE id = p_basket_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql;

-- Seller accepts order
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

  -- Update order
  UPDATE orders
  SET
    status = 'accepted',
    seller_responded_at = NOW(),
    parcel_size = p_parcel_size,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'shipping_method', v_order.shipping_method
  );
END;
$$ LANGUAGE plpgsql;

-- Seller declines order
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
    'payment_intent_id', v_order.stripe_payment_intent_id
  );
END;
$$ LANGUAGE plpgsql;

-- Handle expired seller deadlines (called by cron)
CREATE OR REPLACE FUNCTION handle_expired_seller_deadlines()
RETURNS JSON AS $$
DECLARE
  v_expired_order RECORD;
  v_cancelled_count INTEGER := 0;
  v_refunds_needed JSON[];
BEGIN
  FOR v_expired_order IN
    SELECT id, buyer_id, seller_id, total_amount, stripe_payment_intent_id
    FROM orders
    WHERE status = 'pending_seller'
      AND seller_response_deadline < NOW()
  LOOP
    -- Cancel order
    UPDATE orders
    SET
      status = 'cancelled',
      cancellation_reason = 'Seller did not respond within 24 hours',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_expired_order.id;

    -- Mark listings as available again
    UPDATE listings
    SET
      status = 'active',
      sold_at = NULL,
      updated_at = NOW()
    WHERE id IN (SELECT listing_id FROM order_items WHERE order_id = v_expired_order.id);

    v_cancelled_count := v_cancelled_count + 1;

    -- Track refund needed
    v_refunds_needed := array_append(v_refunds_needed, json_build_object(
      'order_id', v_expired_order.id,
      'buyer_id', v_expired_order.buyer_id,
      'amount', v_expired_order.total_amount,
      'payment_intent_id', v_expired_order.stripe_payment_intent_id
    ));
  END LOOP;

  RETURN json_build_object(
    'cancelled_count', v_cancelled_count,
    'refunds_needed', v_refunds_needed
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 10: Comments
-- ============================================

COMMENT ON TABLE orders IS 'Orders created after successful payment. Tracks full order lifecycle.';
COMMENT ON TABLE order_items IS 'Snapshot of purchased listings at time of order.';
COMMENT ON COLUMN orders.order_number IS 'Human-readable order ID (ORD-YYYY-NNNNNN)';
COMMENT ON COLUMN orders.shipping_method IS 't2t (terminal-to-terminal) or local_pickup';
COMMENT ON COLUMN orders.seller_response_deadline IS 'Seller must respond within 24 hours or order auto-cancels';
COMMENT ON COLUMN orders.parcel_size IS 'Parcel size (XS/S/M/L) chosen by seller for T2T shipping';
COMMENT ON FUNCTION create_order_from_basket IS 'Create order from basket after successful payment';
COMMENT ON FUNCTION seller_accept_order IS 'Seller accepts order, triggers label generation for T2T';
COMMENT ON FUNCTION seller_decline_order IS 'Seller declines order, triggers refund';
COMMENT ON FUNCTION handle_expired_seller_deadlines IS 'Cron job to cancel orders with expired seller deadlines';
