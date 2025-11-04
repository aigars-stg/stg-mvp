-- Minimal games table - just what we need for search
-- This table stores 170k+ games from BGG CSV with minimal columns
-- Full metadata (thumbnails, versions, etc.) fetched from BGG API on-demand

CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  yearpublished INTEGER,
  is_expansion BOOLEAN DEFAULT false,

  -- BGG metadata (populated on-demand when user selects game)
  thumbnail TEXT,
  image TEXT,
  alternate_names JSONB,
  versions JSONB,

  -- Metadata tracking
  metadata_fetched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast search
CREATE INDEX idx_games_name_lower ON games(LOWER(name));
CREATE INDEX idx_games_base_games ON games(id) WHERE is_expansion = false;
CREATE INDEX idx_games_year ON games(yearpublished DESC);

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_games_name_trgm ON games USING gin (name gin_trgm_ops);

-- Row-level security (allow public read for now)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are publicly readable" ON games
  FOR SELECT USING (true);

-- Comments for documentation
COMMENT ON TABLE games IS 'Minimal BGG game database - full metadata fetched on-demand from BGG API';
COMMENT ON COLUMN games.id IS 'BGG game ID (primary key)';
COMMENT ON COLUMN games.name IS 'Game name (indexed for fast search)';
COMMENT ON COLUMN games.yearpublished IS 'Year game was published';
COMMENT ON COLUMN games.is_expansion IS 'True if expansion, false if base game';
COMMENT ON COLUMN games.thumbnail IS 'BGG thumbnail URL (populated on first user selection)';
COMMENT ON COLUMN games.image IS 'BGG full image URL (populated on first user selection)';
COMMENT ON COLUMN games.alternate_names IS 'Alternate game names from BGG (JSON array)';
COMMENT ON COLUMN games.versions IS 'Game versions/editions from BGG (JSON array)';
COMMENT ON COLUMN games.metadata_fetched_at IS 'Timestamp of last BGG metadata fetch';
