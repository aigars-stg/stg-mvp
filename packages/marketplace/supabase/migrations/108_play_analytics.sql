-- ============================================================================
-- MIGRATION: play_analytics
-- PURPOSE: Server-side tracking for Galda Spēle game completions
-- ============================================================================

-- ============================================================================
-- TABLE: play_completions
-- PURPOSE: Track completed game plays (anonymized) for analytics
-- ============================================================================
CREATE TABLE play_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_number INTEGER NOT NULL,
  visitor_id UUID NOT NULL,                    -- From localStorage (anonymous)
  user_id UUID REFERENCES auth.users(id),      -- Optional: if logged in
  status TEXT NOT NULL CHECK (status IN ('won', 'lost')),
  guess_count INTEGER NOT NULL CHECK (guess_count BETWEEN 1 AND 6),
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate completions for same puzzle by same visitor
  UNIQUE(puzzle_number, visitor_id)
);

-- Index for analytics queries by date
CREATE INDEX idx_play_completions_date ON play_completions(completed_at);

-- Index for per-puzzle analytics
CREATE INDEX idx_play_completions_puzzle ON play_completions(puzzle_number);

-- Index for user-specific queries
CREATE INDEX idx_play_completions_user ON play_completions(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE play_completions ENABLE ROW LEVEL SECURITY;

-- Staff can read all completions for analytics
CREATE POLICY "Staff can read play completions"
  ON play_completions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_staff = true
  ));

-- Service role can insert completions (API endpoint uses service role)
CREATE POLICY "Service role can insert completions"
  ON play_completions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE play_completions IS 'Tracks completed Galda Spēle game plays for analytics';
COMMENT ON COLUMN play_completions.puzzle_number IS 'The puzzle number that was completed';
COMMENT ON COLUMN play_completions.visitor_id IS 'Anonymous visitor ID from localStorage';
COMMENT ON COLUMN play_completions.user_id IS 'Optional authenticated user ID';
COMMENT ON COLUMN play_completions.status IS 'Game outcome: won or lost';
COMMENT ON COLUMN play_completions.guess_count IS 'Number of guesses used (1-6)';
COMMENT ON COLUMN play_completions.completed_at IS 'When the game was completed (client timestamp)';
