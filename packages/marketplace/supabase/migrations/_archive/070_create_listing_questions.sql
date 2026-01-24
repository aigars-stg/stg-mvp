-- Migration: Create public Q&A system for listings
-- Description: Enables buyers to publicly ask questions about listings, with seller answers
-- Public read access, authenticated write (login required to post)

-- ============================================================================
-- STEP 1: Create listing_questions table
-- ============================================================================

CREATE TABLE listing_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,

  -- Threading: NULL = top-level question, UUID = reply to a question
  -- Max 2 levels: questions can have replies, but no reply-to-reply
  parent_id UUID REFERENCES listing_questions(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete to preserve thread integrity

  -- Constraints
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT content_max_length CHECK (char_length(content) <= 2000)
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

-- Primary query: fetch questions for a listing
CREATE INDEX idx_listing_questions_listing ON listing_questions(listing_id, created_at DESC);

-- For fetching replies to a question
CREATE INDEX idx_listing_questions_parent ON listing_questions(parent_id) WHERE parent_id IS NOT NULL;

-- For user's question history
CREATE INDEX idx_listing_questions_user ON listing_questions(user_id, created_at DESC);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE listing_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions (public Q&A for trust building)
CREATE POLICY "Questions are publicly readable"
  ON listing_questions FOR SELECT
  TO public
  USING (deleted_at IS NULL);

-- Authenticated users can create questions, but NOT on their own listings
CREATE POLICY "Authenticated users can post questions on others' listings"
  ON listing_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id
        AND l.status = 'active'
        AND l.seller_id != auth.uid() -- Cannot ask questions on own listing
    )
  );

-- Users can update their own questions
CREATE POLICY "Users can update their own questions"
  ON listing_questions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own questions
CREATE POLICY "Users can delete their own questions"
  ON listing_questions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 4: Trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_listing_question_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listing_questions_updated_at
  BEFORE UPDATE ON listing_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_question_updated_at();

-- ============================================================================
-- STEP 5: Function to enforce 2-level max depth
-- ============================================================================

CREATE OR REPLACE FUNCTION check_question_depth()
RETURNS TRIGGER AS $$
DECLARE
  parent_has_parent BOOLEAN;
BEGIN
  -- If this is a reply (has parent_id), check that parent is a top-level question
  IF NEW.parent_id IS NOT NULL THEN
    SELECT (parent_id IS NOT NULL) INTO parent_has_parent
    FROM listing_questions
    WHERE id = NEW.parent_id;

    IF parent_has_parent THEN
      RAISE EXCEPTION 'Cannot reply to a reply. Maximum thread depth is 2 levels.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_question_depth
  BEFORE INSERT ON listing_questions
  FOR EACH ROW
  EXECUTE FUNCTION check_question_depth();

-- ============================================================================
-- STEP 6: Function to get question count for a listing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_listing_question_count(p_listing_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM listing_questions
    WHERE listing_id = p_listing_id
      AND parent_id IS NULL -- Count only top-level questions
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 7: View for questions with author info
-- ============================================================================

CREATE OR REPLACE VIEW listing_questions_with_author AS
SELECT
  lq.id,
  lq.listing_id,
  lq.user_id,
  lq.content,
  lq.parent_id,
  lq.created_at,
  lq.updated_at,
  lq.deleted_at,
  up.full_name AS author_name,
  up.avatar_url AS author_avatar,
  -- Determine if author is the listing's seller
  (lq.user_id = l.seller_id) AS is_seller
FROM listing_questions lq
JOIN user_profiles up ON lq.user_id = up.id
JOIN listings l ON lq.listing_id = l.id
WHERE lq.deleted_at IS NULL;

-- ============================================================================
-- STEP 8: Comments for documentation
-- ============================================================================

COMMENT ON TABLE listing_questions IS 'Public Q&A on listings. Buyers ask questions, sellers answer. Max 2 levels (question + replies).';
COMMENT ON COLUMN listing_questions.content IS 'Question or answer text, max 2000 characters';
COMMENT ON COLUMN listing_questions.parent_id IS 'NULL for top-level questions, UUID for replies to questions';
COMMENT ON COLUMN listing_questions.deleted_at IS 'Soft delete timestamp to preserve thread integrity';

COMMENT ON FUNCTION get_listing_question_count IS 'Get count of top-level questions for a listing (for badge display)';
COMMENT ON FUNCTION check_question_depth IS 'Ensures max 2-level depth: questions can have replies, but no nested replies';
