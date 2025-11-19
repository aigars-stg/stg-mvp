-- Add version/edition fields to wanted_listings table to match listings table structure
-- This allows buyers to specify exactly which version/edition/language they're looking for

ALTER TABLE wanted_listings
ADD COLUMN IF NOT EXISTS version_source TEXT DEFAULT 'bgg',
ADD COLUMN IF NOT EXISTS bgg_version_id INTEGER,
ADD COLUMN IF NOT EXISTS version_name TEXT,
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS edition_year INTEGER,
ADD COLUMN IF NOT EXISTS version_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS version_image TEXT;

-- Add comments for clarity
COMMENT ON COLUMN wanted_listings.version_source IS 'Source of version data (e.g., "bgg" for BoardGameGeek)';
COMMENT ON COLUMN wanted_listings.bgg_version_id IS 'BGG version ID if version_source is "bgg"';
COMMENT ON COLUMN wanted_listings.version_name IS 'Name/edition of the version (e.g., "First Edition", "Deluxe Edition")';
COMMENT ON COLUMN wanted_listings.publisher IS 'Publisher(s) of this version';
COMMENT ON COLUMN wanted_listings.language IS 'Language(s) of this version';
COMMENT ON COLUMN wanted_listings.edition_year IS 'Year this edition was published';
COMMENT ON COLUMN wanted_listings.version_thumbnail IS 'Thumbnail image URL for this specific version';
COMMENT ON COLUMN wanted_listings.version_image IS 'Full-size image URL for this specific version';

-- Keep preferred_language as an optional additional field for free-text preferences
COMMENT ON COLUMN wanted_listings.preferred_language IS 'Deprecated: Use language column instead. Kept for backward compatibility.';
