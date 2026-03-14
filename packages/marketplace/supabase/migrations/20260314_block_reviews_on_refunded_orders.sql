-- Migration: Block reviews on refunded/cancelled orders
-- Fixes audit issue 6.3: buyers could leave reviews on refunded orders

-- ============================================================================
-- STEP 1: Update can_buyer_review_order to reject refunded/cancelled orders
-- ============================================================================

CREATE OR REPLACE FUNCTION can_buyer_review_order(p_order_id UUID, p_buyer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_existing_review RECORD;
BEGIN
  -- Check order exists and belongs to buyer
  SELECT id, status, buyer_id, seller_id, updated_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('can_review', false, 'reason', 'Order not found');
  END IF;

  IF v_order.buyer_id != p_buyer_id THEN
    RETURN json_build_object('can_review', false, 'reason', 'Not your order');
  END IF;

  -- Block reviews on refunded or cancelled orders
  IF v_order.status IN ('refunded', 'cancelled') THEN
    RETURN json_build_object('can_review', false, 'reason', 'Reviews are not available for refunded or cancelled orders');
  END IF;

  -- Check order is in reviewable status
  IF v_order.status NOT IN ('delivered', 'completed') THEN
    RETURN json_build_object('can_review', false, 'reason', 'Order not yet delivered');
  END IF;

  -- Check if already reviewed
  SELECT id INTO v_existing_review
  FROM seller_reviews
  WHERE order_id = p_order_id;

  IF FOUND THEN
    RETURN json_build_object('can_review', false, 'reason', 'Already reviewed', 'review_id', v_existing_review.id);
  END IF;

  RETURN json_build_object(
    'can_review', true,
    'order_id', p_order_id,
    'seller_id', v_order.seller_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Update RLS INSERT policy to also exclude refunded/cancelled orders
-- ============================================================================

DROP POLICY IF EXISTS "Buyers can create reviews for their orders" ON seller_reviews;

CREATE POLICY "Buyers can create reviews for their orders"
  ON seller_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.buyer_id = auth.uid()
        AND orders.status IN ('delivered', 'completed')
    )
  );
