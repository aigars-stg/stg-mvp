-- Fix create_order_from_basket function to use correct column name
-- The column was renamed from game_bgg_id to bgg_game_id in migration 042

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

  -- Copy items from basket to order (using correct column name bgg_game_id)
  INSERT INTO order_items (order_id, listing_id, game_name, bgg_game_id, price, condition, photo_url)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
