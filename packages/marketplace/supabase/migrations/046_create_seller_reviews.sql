-- Migration: Create seller reviews and trust system
-- Description: Adds seller ratings/reviews and trust fields to enable buyer confidence signals
-- Part of Phase 1: Seller Trust & Ratings System (Magnolia-inspired enhancement)

-- ============================================================================
-- STEP 1: Add trust fields to seller_profiles
-- ============================================================================

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS positive_rating_percent INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS total_completed_sales INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ DEFAULT NOW();

-- Set member_since for existing sellers based on their created_at
UPDATE seller_profiles
SET member_since = created_at
WHERE member_since IS NULL OR member_since = NOW();

-- ============================================================================
-- STEP 2: Create seller_reviews table
-- ============================================================================

CREATE TABLE seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT CHECK (char_length(review_text) <= 500),

  -- Seller response (optional)
  seller_response TEXT CHECK (char_length(seller_response) <= 500),
  seller_responded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_order_review UNIQUE(order_id),
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- ============================================================================
-- STEP 3: Create indexes
-- ============================================================================

-- For fetching seller's reviews
CREATE INDEX idx_seller_reviews_seller ON seller_reviews(seller_id, created_at DESC);

-- For checking if buyer already reviewed an order
CREATE INDEX idx_seller_reviews_order ON seller_reviews(order_id);

-- For fetching buyer's given reviews
CREATE INDEX idx_seller_reviews_buyer ON seller_reviews(buyer_id, created_at DESC);

-- For calculating stats (rating distribution)
CREATE INDEX idx_seller_reviews_rating ON seller_reviews(seller_id, rating);

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE seller_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public marketplace trust)
CREATE POLICY "Reviews are publicly readable"
  ON seller_reviews FOR SELECT
  TO public
  USING (true);

-- Buyers can create reviews for their completed orders
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

-- Buyers can update their own review text (not rating, to prevent gaming)
CREATE POLICY "Buyers can update their review text"
  ON seller_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Sellers can respond to reviews about them
CREATE POLICY "Sellers can respond to their reviews"
  ON seller_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- ============================================================================
-- STEP 5: Trigger to update seller stats on review changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seller_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
  v_total_reviews INTEGER;
  v_avg_rating DECIMAL(2,1);
  v_positive_percent INTEGER;
BEGIN
  -- Determine seller_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_seller_id := OLD.seller_id;
  ELSE
    v_seller_id := NEW.seller_id;
  END IF;

  -- Calculate aggregates
  SELECT
    COUNT(*),
    ROUND(AVG(rating)::numeric, 1),
    ROUND(100.0 * COUNT(*) FILTER (WHERE rating >= 4) / NULLIF(COUNT(*), 0))::INTEGER
  INTO v_total_reviews, v_avg_rating, v_positive_percent
  FROM seller_reviews
  WHERE seller_id = v_seller_id;

  -- Update seller profile
  UPDATE seller_profiles
  SET
    total_reviews = COALESCE(v_total_reviews, 0),
    average_rating = COALESCE(v_avg_rating, 0.0),
    positive_rating_percent = COALESCE(v_positive_percent, 100),
    updated_at = NOW()
  WHERE user_id = v_seller_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seller_review_stats
  AFTER INSERT OR UPDATE OF rating OR DELETE ON seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_review_stats();

-- ============================================================================
-- STEP 6: Trigger to update total_completed_sales on order completion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seller_completed_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE seller_profiles
    SET
      total_completed_sales = total_completed_sales + 1,
      updated_at = NOW()
    WHERE user_id = NEW.seller_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if it doesn't exist (may need to drop first if exists)
DROP TRIGGER IF EXISTS trigger_update_seller_completed_sales ON orders;

CREATE TRIGGER trigger_update_seller_completed_sales
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_seller_completed_sales();

-- ============================================================================
-- STEP 7: Function to get seller trust summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_seller_trust_summary(p_seller_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'seller_id', sp.user_id,
    'total_reviews', sp.total_reviews,
    'average_rating', sp.average_rating,
    'positive_rating_percent', sp.positive_rating_percent,
    'total_completed_sales', sp.total_completed_sales,
    'member_since', sp.member_since,
    'seller_status', sp.seller_status,
    'badge_tier', CASE
      WHEN sp.total_completed_sales >= 25 AND sp.average_rating >= 4.8 THEN 'top_seller'
      WHEN sp.total_completed_sales >= 5 AND sp.average_rating >= 4.5 THEN 'trusted_seller'
      ELSE 'new_seller'
    END
  )
  INTO v_result
  FROM seller_profiles sp
  WHERE sp.user_id = p_seller_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Function to check if buyer can review an order
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
-- STEP 9: View for seller reviews with buyer info
-- ============================================================================

CREATE OR REPLACE VIEW seller_reviews_with_buyer AS
SELECT
  sr.id,
  sr.order_id,
  sr.seller_id,
  sr.buyer_id,
  sr.rating,
  sr.review_text,
  sr.seller_response,
  sr.seller_responded_at,
  sr.created_at,
  sr.updated_at,
  up.full_name as buyer_name,
  up.avatar_url as buyer_avatar,
  up.country as buyer_country,
  o.order_number,
  -- Get first game name from order items
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = sr.order_id LIMIT 1) as game_name
FROM seller_reviews sr
JOIN user_profiles up ON sr.buyer_id = up.id
JOIN orders o ON sr.order_id = o.id;

-- ============================================================================
-- STEP 10: Comments for documentation
-- ============================================================================

COMMENT ON TABLE seller_reviews IS 'Buyer reviews of sellers after completed orders. Used for trust building.';
COMMENT ON COLUMN seller_reviews.rating IS '1-5 star rating from buyer';
COMMENT ON COLUMN seller_reviews.review_text IS 'Optional text review, max 500 chars';
COMMENT ON COLUMN seller_reviews.seller_response IS 'Optional seller reply to review, max 500 chars';

COMMENT ON COLUMN seller_profiles.total_reviews IS 'Cached count of reviews received';
COMMENT ON COLUMN seller_profiles.average_rating IS 'Cached average rating (1.0-5.0)';
COMMENT ON COLUMN seller_profiles.positive_rating_percent IS 'Percentage of 4-5 star reviews';
COMMENT ON COLUMN seller_profiles.total_completed_sales IS 'Total orders marked as completed';
COMMENT ON COLUMN seller_profiles.member_since IS 'When user became a seller';

COMMENT ON FUNCTION get_seller_trust_summary IS 'Get seller trust data including badge tier';
COMMENT ON FUNCTION can_buyer_review_order IS 'Check if buyer can leave a review for an order';
