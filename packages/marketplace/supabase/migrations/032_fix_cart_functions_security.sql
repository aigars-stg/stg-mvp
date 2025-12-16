-- Fix cart functions to bypass RLS when reserving listings
-- The add_to_cart and remove_from_cart functions need SECURITY DEFINER
-- to update the reserved_by/reserved_until columns on listings owned by sellers

-- ============================================
-- Recreate add_to_cart with SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION add_to_cart(
  p_buyer_id UUID,
  p_listing_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_basket_id UUID;
  v_item_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get listing details
  SELECT id, seller_id, price, status, reserved_until
  INTO v_listing
  FROM listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- Check if buyer is trying to buy their own listing
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot buy your own listing');
  END IF;

  -- Check if listing is available
  IF v_listing.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Listing is not active');
  END IF;

  IF v_listing.reserved_until IS NOT NULL AND v_listing.reserved_until > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Listing is already reserved');
  END IF;

  -- Check basket limit (max 10 items per seller)
  SELECT b.id INTO v_basket_id
  FROM baskets b
  WHERE b.buyer_id = p_buyer_id AND b.seller_id = v_listing.seller_id;

  IF FOUND THEN
    IF (SELECT COUNT(*) FROM basket_items WHERE basket_id = v_basket_id) >= 10 THEN
      RETURN json_build_object('success', false, 'error', 'Maximum 10 items per seller');
    END IF;
  END IF;

  -- Calculate expiration (30 minutes from now)
  v_expires_at := NOW() + INTERVAL '30 minutes';

  -- Get or create basket
  INSERT INTO baskets (buyer_id, seller_id)
  VALUES (p_buyer_id, v_listing.seller_id)
  ON CONFLICT (buyer_id, seller_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_basket_id;

  -- Reserve the listing (this now works because SECURITY DEFINER bypasses RLS)
  UPDATE listings
  SET reserved_by = p_buyer_id, reserved_until = v_expires_at, updated_at = NOW()
  WHERE id = p_listing_id
    AND status = 'active'
    AND (reserved_until IS NULL OR reserved_until < NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Could not reserve listing');
  END IF;

  -- Add to basket
  INSERT INTO basket_items (basket_id, listing_id, price_at_add, expires_at)
  VALUES (v_basket_id, p_listing_id, v_listing.price, v_expires_at)
  ON CONFLICT (listing_id) DO NOTHING
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    -- Rollback reservation
    UPDATE listings SET reserved_by = NULL, reserved_until = NULL WHERE id = p_listing_id;
    RETURN json_build_object('success', false, 'error', 'Item already in a cart');
  END IF;

  RETURN json_build_object(
    'success', true,
    'basket_id', v_basket_id,
    'item_id', v_item_id,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Recreate remove_from_cart with SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION remove_from_cart(
  p_buyer_id UUID,
  p_listing_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_basket_id UUID;
BEGIN
  -- Find the basket item
  SELECT bi.basket_id INTO v_basket_id
  FROM basket_items bi
  JOIN baskets b ON bi.basket_id = b.id
  WHERE bi.listing_id = p_listing_id AND b.buyer_id = p_buyer_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Item not in cart');
  END IF;

  -- Release reservation (this now works because SECURITY DEFINER bypasses RLS)
  UPDATE listings
  SET reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE id = p_listing_id AND reserved_by = p_buyer_id;

  -- Remove from basket (trigger will delete empty basket)
  DELETE FROM basket_items WHERE listing_id = p_listing_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Recreate cleanup function with SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned INTEGER := 0;
  v_expired_item RECORD;
BEGIN
  -- Find and process expired items
  FOR v_expired_item IN
    SELECT bi.id, bi.listing_id
    FROM basket_items bi
    WHERE bi.expires_at < NOW()
  LOOP
    -- Release reservation
    UPDATE listings
    SET reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
    WHERE id = v_expired_item.listing_id;

    -- Delete basket item
    DELETE FROM basket_items WHERE id = v_expired_item.id;

    v_cleaned := v_cleaned + 1;
  END LOOP;

  RETURN v_cleaned;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION add_to_cart IS 'Add a listing to buyer cart with SECURITY DEFINER to bypass RLS for reservation updates';
COMMENT ON FUNCTION remove_from_cart IS 'Remove a listing from cart with SECURITY DEFINER to bypass RLS for reservation release';
COMMENT ON FUNCTION cleanup_expired_cart_items IS 'Cron job function to clean expired reservations with SECURITY DEFINER';
