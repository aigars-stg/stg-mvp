-- Add description and designers columns to games table
-- These fields provide additional game information from BGG API

ALTER TABLE games
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS designers JSONB;

-- Add comment documentation
COMMENT ON COLUMN games.description IS 'Full game description from BGG (HTML-encoded text)';
COMMENT ON COLUMN games.designers IS 'Array of game designer names from BGG';
