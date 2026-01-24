-- Add BGG metadata columns to games table
-- These fields provide additional game information for listings

ALTER TABLE games
ADD COLUMN IF NOT EXISTS player_count TEXT,
ADD COLUMN IF NOT EXISTS min_age INTEGER,
ADD COLUMN IF NOT EXISTS playing_time TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_player_count ON games(player_count) WHERE player_count IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_games_min_age ON games(min_age) WHERE min_age IS NOT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN games.player_count IS 'Player count range from BGG (e.g., "2-4", "1-6")';
COMMENT ON COLUMN games.min_age IS 'Minimum recommended age from BGG';
COMMENT ON COLUMN games.playing_time IS 'Playing time from BGG (e.g., "45", "30-60")';
