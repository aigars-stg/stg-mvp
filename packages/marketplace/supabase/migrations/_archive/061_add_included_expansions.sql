-- Add included_expansions column to listings table
-- Allows sellers to bundle game expansions with the base game
-- One price and condition covers the entire bundle

ALTER TABLE listings ADD COLUMN included_expansions JSONB DEFAULT '[]'::jsonb;

-- Example data structure:
-- [
--   {
--     "bgg_id": 926,
--     "name": "Catan: Seafarers",
--     "year": 1997,
--     "version_source": "bgg",
--     "bgg_version_id": 12345,
--     "version_name": "English edition",
--     "language": "English",
--     "publisher": "Kosmos",
--     "thumbnail": "https://...",
--     "image": "https://..."
--   }
-- ]

-- Add comment for documentation
COMMENT ON COLUMN listings.included_expansions IS 'JSONB array of game expansions included with this listing. Each expansion includes version info (language, publisher) and images.';

-- Create index for querying listings with expansions
CREATE INDEX idx_listings_has_expansions ON listings ((jsonb_array_length(included_expansions) > 0))
WHERE jsonb_array_length(included_expansions) > 0;
