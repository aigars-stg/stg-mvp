-- Add game_thumbnail column to order_items
-- Captures BGG thumbnail URL at order creation time so order rows can display cover art
ALTER TABLE order_items ADD COLUMN game_thumbnail TEXT;

-- Update create_order_from_basket to capture BGG thumbnail from games table
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
  p_stripe_payment_intent_id VARCHAR DEFAULT NULL
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
    stripe_payment_intent_id, paid_at, seller_response_deadline, status
  ) VALUES (
    v_order_number, v_basket.buyer_id, v_basket.seller_id, p_shipping_method,
    p_destination_country, p_destination_terminal_id, p_destination_terminal_name, p_destination_terminal_address,
    v_seller_country, p_pickup_city, p_pickup_notes,
    p_receiver_name, p_receiver_phone, p_receiver_email,
    v_items_total, p_shipping_cost, p_service_fee, v_total_amount,
    p_stripe_payment_intent_id, NOW(), NOW() + INTERVAL '24 hours', 'pending_seller'
  ) RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, listing_id, game_name, bgg_game_id, price, condition, photo_url, game_thumbnail)
  SELECT v_order_id, l.id, l.game_name, l.bgg_game_id, l.price, l.condition, l.photo_urls[1], g.thumbnail
  FROM basket_items bi
  JOIN listings l ON bi.listing_id = l.id
  LEFT JOIN games g ON l.bgg_game_id = g.id
  WHERE bi.basket_id = p_basket_id;

  UPDATE listings SET status = 'sold', sold_at = NOW(), reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE id IN (SELECT listing_id FROM basket_items WHERE basket_id = p_basket_id);

  DELETE FROM baskets WHERE id = p_basket_id;

  RETURN json_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total_amount', v_total_amount);
END;
$$;
