-- Create shopping cart (baskets) system
-- Baskets group items by seller for multi-seller checkout

-- ============================================
-- STEP 1: Create baskets table
-- ============================================

-- Each basket represents a buyer's cart with a specific seller
-- A buyer can have multiple baskets (one per seller they're buying from)
CREATE TABLE baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One basket per buyer-seller combination
  UNIQUE(buyer_id, seller_id),

  -- Buyer and seller must be different people
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- ============================================
-- STEP 2: Create basket_items table
-- ============================================

-- Individual items in a basket
CREATE TABLE basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Price at time of adding to cart (for display, actual price from listing)
  price_at_add DECIMAL(10,2) NOT NULL,

  -- Reservation tracking
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- reserved_at + 30 minutes

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- A listing can only be in one basket at a time
  UNIQUE(listing_id)
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

CREATE INDEX idx_baskets_buyer ON baskets(buyer_id);
CREATE INDEX idx_baskets_seller ON baskets(seller_id);
CREATE INDEX idx_basket_items_basket ON basket_items(basket_id);
CREATE INDEX idx_basket_items_listing ON basket_items(listing_id);
CREATE INDEX idx_basket_items_expires ON basket_items(expires_at);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies for baskets
-- ============================================

-- Buyers can view their own baskets
CREATE POLICY "Buyers can view their baskets"
  ON baskets
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view baskets where they are the seller (to see pending interest)
CREATE POLICY "Sellers can view baskets for their listings"
  ON baskets
  FOR SELECT
  USING (auth.uid() = seller_id);

-- Buyers can create baskets
CREATE POLICY "Buyers can create baskets"
  ON baskets
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can delete their baskets
CREATE POLICY "Buyers can delete their baskets"
  ON baskets
  FOR DELETE
  USING (auth.uid() = buyer_id);

-- ============================================
-- STEP 6: RLS Policies for basket_items
-- ============================================

-- Buyers can view items in their baskets
CREATE POLICY "Buyers can view their basket items"
  ON basket_items
  FOR SELECT
  USING (
    basket_id IN (SELECT id FROM baskets WHERE buyer_id = auth.uid())
  );

-- Buyers can add items to their baskets
CREATE POLICY "Buyers can add basket items"
  ON basket_items
  FOR INSERT
  WITH CHECK (
    basket_id IN (SELECT id FROM baskets WHERE buyer_id = auth.uid())
  );

-- Buyers can remove items from their baskets
CREATE POLICY "Buyers can remove basket items"
  ON basket_items
  FOR DELETE
  USING (
    basket_id IN (SELECT id FROM baskets WHERE buyer_id = auth.uid())
  );

-- ============================================
-- STEP 7: Triggers
-- ============================================

-- Update basket's updated_at when items change
CREATE OR REPLACE FUNCTION update_basket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE baskets SET updated_at = NOW() WHERE id = OLD.basket_id;
    RETURN OLD;
  ELSE
    UPDATE baskets SET updated_at = NOW() WHERE id = NEW.basket_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_basket_on_item_change
  AFTER INSERT OR DELETE ON basket_items
  FOR EACH ROW
  EXECUTE FUNCTION update_basket_timestamp();

-- Auto-delete empty baskets
CREATE OR REPLACE FUNCTION delete_empty_basket()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM baskets
  WHERE id = OLD.basket_id
  AND NOT EXISTS (SELECT 1 FROM basket_items WHERE basket_id = OLD.basket_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_empty_basket_on_item_remove
  AFTER DELETE ON basket_items
  FOR EACH ROW
  EXECUTE FUNCTION delete_empty_basket();

-- ============================================
-- STEP 8: Helper functions
-- ============================================

-- Add item to cart (creates basket if needed, reserves listing)
CREATE OR REPLACE FUNCTION add_to_cart(
  p_buyer_id UUID,
  p_listing_id UUID
)
RETURNS JSON AS $$
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

  -- Start transaction
  -- Get or create basket
  INSERT INTO baskets (buyer_id, seller_id)
  VALUES (p_buyer_id, v_listing.seller_id)
  ON CONFLICT (buyer_id, seller_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_basket_id;

  -- Reserve the listing
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

-- Remove item from cart (releases reservation)
CREATE OR REPLACE FUNCTION remove_from_cart(
  p_buyer_id UUID,
  p_listing_id UUID
)
RETURNS JSON AS $$
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

  -- Release reservation
  UPDATE listings
  SET reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE id = p_listing_id AND reserved_by = p_buyer_id;

  -- Remove from basket (trigger will delete empty basket)
  DELETE FROM basket_items WHERE listing_id = p_listing_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Get cart contents for a buyer
CREATE OR REPLACE FUNCTION get_cart(p_buyer_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(basket_data)
    FROM (
      SELECT json_build_object(
        'basket_id', b.id,
        'seller_id', b.seller_id,
        'seller_name', up.full_name,
        'seller_country', up.country,
        'items', (
          SELECT json_agg(json_build_object(
            'item_id', bi.id,
            'listing_id', bi.listing_id,
            'game_name', l.game_name,
            'price', l.price,
            'photo_url', l.photo_urls[1],
            'condition', l.condition,
            'expires_at', bi.expires_at,
            'is_expired', bi.expires_at < NOW()
          ) ORDER BY bi.created_at)
          FROM basket_items bi
          JOIN listings l ON bi.listing_id = l.id
          WHERE bi.basket_id = b.id
        ),
        'item_count', (SELECT COUNT(*) FROM basket_items WHERE basket_id = b.id),
        'subtotal', (
          SELECT SUM(l.price)
          FROM basket_items bi
          JOIN listings l ON bi.listing_id = l.id
          WHERE bi.basket_id = b.id
        )
      ) AS basket_data
      FROM baskets b
      JOIN user_profiles up ON b.seller_id = up.id
      WHERE b.buyer_id = p_buyer_id
      ORDER BY b.updated_at DESC
    ) AS baskets_query
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Clean up expired basket items and release reservations
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS INTEGER AS $$
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
-- STEP 9: Comments
-- ============================================

COMMENT ON TABLE baskets IS 'Shopping carts grouped by seller. One basket per buyer-seller combination.';
COMMENT ON TABLE basket_items IS 'Individual listings in a basket with 30-minute reservation timer.';
COMMENT ON COLUMN basket_items.price_at_add IS 'Price when item was added (for reference, actual price from listing)';
COMMENT ON COLUMN basket_items.expires_at IS 'When the 30-minute reservation expires';
COMMENT ON FUNCTION add_to_cart IS 'Add a listing to buyer cart, creating basket if needed and reserving listing';
COMMENT ON FUNCTION remove_from_cart IS 'Remove a listing from cart and release reservation';
COMMENT ON FUNCTION get_cart IS 'Get full cart contents for a buyer with seller grouping';
COMMENT ON FUNCTION cleanup_expired_cart_items IS 'Cron job function to clean expired reservations';
