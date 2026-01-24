-- Migration: Create wanted listing responses system
-- Description: Tracks seller responses to ISO/wanted listings with offer details

-- ============================================================================
-- TABLE: wanted_listing_responses
-- ============================================================================

CREATE TABLE wanted_listing_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  wanted_listing_id UUID NOT NULL REFERENCES wanted_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Offer Details
  offered_price DECIMAL(10,2) NOT NULL CHECK (offered_price > 0),
  offered_condition TEXT NOT NULL CHECK (offered_condition IN ('likeNew', 'veryGood', 'good', 'acceptable')),
  response_notes TEXT, -- Optional additional details from seller

  -- Response Metadata
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_quick_response BOOLEAN DEFAULT false, -- True if responded within 2 hours of ISO creation

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  -- One response per seller per wanted listing
  CONSTRAINT unique_seller_response UNIQUE(wanted_listing_id, seller_id)
  -- Note: Self-response prevention is handled by can_respond_to_wanted_listing() function and RLS policy
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core indexes for common queries
CREATE INDEX idx_responses_wanted_listing ON wanted_listing_responses(wanted_listing_id, responded_at DESC);
CREATE INDEX idx_responses_seller ON wanted_listing_responses(seller_id);
CREATE INDEX idx_responses_conversation ON wanted_listing_responses(conversation_id);
CREATE INDEX idx_responses_quick ON wanted_listing_responses(is_quick_response) WHERE is_quick_response = true;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at on every update
CREATE TRIGGER update_wanted_listing_responses_updated_at
  BEFORE UPDATE ON wanted_listing_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Increment response_count on wanted_listings when response is created
CREATE OR REPLACE FUNCTION increment_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wanted_listings
  SET response_count = response_count + 1
  WHERE id = NEW.wanted_listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_response_increment_count
  AFTER INSERT ON wanted_listing_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_response_count();

-- Trigger: Decrement response_count when response is deleted
CREATE OR REPLACE FUNCTION decrement_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wanted_listings
  SET response_count = response_count - 1
  WHERE id = OLD.wanted_listing_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_response_delete_decrement_count
  AFTER DELETE ON wanted_listing_responses
  FOR EACH ROW
  EXECUTE FUNCTION decrement_response_count();

-- Function: Check if seller can respond to wanted listing
-- Validates: not own listing, not at max responses, listing is active, not already responded
CREATE OR REPLACE FUNCTION can_respond_to_wanted_listing(
  p_wanted_listing_id UUID,
  p_seller_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_buyer_id UUID;
  v_status TEXT;
  v_response_count INTEGER;
  v_already_responded BOOLEAN;
BEGIN
  -- Get wanted listing details
  SELECT buyer_id, status, response_count
  INTO v_buyer_id, v_status, v_response_count
  FROM wanted_listings
  WHERE id = p_wanted_listing_id;

  -- Check if listing exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if seller is trying to respond to own listing
  IF v_buyer_id = p_seller_id THEN
    RETURN false;
  END IF;

  -- Check if listing is active
  IF v_status != 'active' THEN
    RETURN false;
  END IF;

  -- Check if at max responses (10)
  IF v_response_count >= 10 THEN
    RETURN false;
  END IF;

  -- Check if seller already responded
  SELECT EXISTS(
    SELECT 1 FROM wanted_listing_responses
    WHERE wanted_listing_id = p_wanted_listing_id
    AND seller_id = p_seller_id
  ) INTO v_already_responded;

  IF v_already_responded THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Determine if response qualifies as "quick response" (within 2 hours)
CREATE OR REPLACE FUNCTION is_quick_response(
  p_wanted_listing_id UUID,
  p_response_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO v_created_at
  FROM wanted_listings
  WHERE id = p_wanted_listing_id;

  RETURN (p_response_time - v_created_at) <= INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE wanted_listing_responses ENABLE ROW LEVEL SECURITY;

-- Buyers can view responses to their wanted listings
CREATE POLICY "Buyers can view responses to their ISOs"
  ON wanted_listing_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wanted_listings
      WHERE id = wanted_listing_id
      AND buyer_id = auth.uid()
    )
  );

-- Sellers can view their own responses
CREATE POLICY "Sellers can view their own responses"
  ON wanted_listing_responses
  FOR SELECT
  USING (auth.uid() = seller_id);

-- Authenticated users can create responses (validation in application layer)
CREATE POLICY "Authenticated users can create responses"
  ON wanted_listing_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND can_respond_to_wanted_listing(wanted_listing_id, seller_id)
  );

-- Sellers can update their own responses (e.g., update notes or price)
CREATE POLICY "Sellers can update their own responses"
  ON wanted_listing_responses
  FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own responses
CREATE POLICY "Sellers can delete their own responses"
  ON wanted_listing_responses
  FOR DELETE
  USING (auth.uid() = seller_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE wanted_listing_responses IS 'Tracks seller responses to ISO/wanted listings with offer details';
COMMENT ON COLUMN wanted_listing_responses.is_quick_response IS 'True if seller responded within 2 hours of ISO creation (earns Quick Responder badge)';
COMMENT ON COLUMN wanted_listing_responses.response_notes IS 'Optional additional details from seller about their offer';
COMMENT ON COLUMN wanted_listing_responses.conversation_id IS 'Links to the conversation created when seller clicked "I Have This"';
