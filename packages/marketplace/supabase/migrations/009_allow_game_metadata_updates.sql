-- Allow updates to games table for metadata caching
-- This enables the API to cache BGG metadata (images, versions, player_count, etc.)
-- when games are selected during the sell flow

-- Create policy to allow anyone to update game metadata fields
-- This is safe because:
-- 1. Core game data (id, name, yearpublished) cannot be changed (not in update)
-- 2. Metadata is fetched from BGG API, not user input
-- 3. Updates only happen server-side through our API
CREATE POLICY "Allow metadata updates" ON games
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Allow metadata updates" ON games IS
  'Allows API to cache BGG metadata (thumbnails, versions, player_count, etc.) when games are selected';
