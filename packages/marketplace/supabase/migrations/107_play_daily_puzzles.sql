-- ============================================================================
-- MIGRATION: play_daily_puzzles
-- PURPOSE: Daily board game guessing game ("Galda Spēle") puzzle storage
-- ============================================================================

-- ============================================================================
-- TABLE: play_daily_puzzles
-- PURPOSE: Stores daily puzzle assignments with cached BGG attributes
-- FEATURES: Deterministic puzzle selection, on-demand BGG enrichment
-- ============================================================================
CREATE TABLE play_daily_puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_number INTEGER UNIQUE NOT NULL,
  game_id INTEGER REFERENCES games(id) NOT NULL,

  -- Cached BGG attributes (fetched once when puzzle is created)
  -- These fields are fetched from BGG API and cached here for feedback calculation
  bgg_weight DECIMAL(3,2),           -- Game complexity (1.0 - 5.0)
  bgg_categories TEXT[],             -- BGG categories (e.g., "Strategy", "Economic")
  bgg_mechanics TEXT[],              -- BGG mechanics (e.g., "Worker Placement", "Deck Building")

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient puzzle lookup by number
CREATE INDEX idx_play_daily_puzzles_number ON play_daily_puzzles(puzzle_number);

-- Index for checking if a game has been used as a puzzle
CREATE INDEX idx_play_daily_puzzles_game ON play_daily_puzzles(game_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE play_daily_puzzles ENABLE ROW LEVEL SECURITY;

-- Anyone can read puzzles (needed for the game to work)
CREATE POLICY "Anyone can read daily puzzles"
  ON play_daily_puzzles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can insert/update (puzzle generation is server-side)
CREATE POLICY "Service role can manage puzzles"
  ON play_daily_puzzles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE play_daily_puzzles IS 'Daily puzzle assignments for Galda Spēle guessing game';
COMMENT ON COLUMN play_daily_puzzles.puzzle_number IS 'Sequential puzzle number (1 = launch day, increments daily)';
COMMENT ON COLUMN play_daily_puzzles.game_id IS 'Reference to the target game for this puzzle';
COMMENT ON COLUMN play_daily_puzzles.bgg_weight IS 'Cached BGG complexity weight (1.0-5.0 scale)';
COMMENT ON COLUMN play_daily_puzzles.bgg_categories IS 'Cached BGG categories array';
COMMENT ON COLUMN play_daily_puzzles.bgg_mechanics IS 'Cached BGG mechanics array';
