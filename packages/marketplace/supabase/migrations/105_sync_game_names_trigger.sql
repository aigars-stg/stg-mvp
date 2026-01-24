-- ============================================================================
-- Migration: Sync Game Names to Listings
-- Purpose: Prevent stale game_name in listings when games.name is corrected
-- Created: 2026-01-24
--
-- Context: The listings and wanted_listings tables store game_name as a
-- denormalized column for performance (avoids JOIN on every listing query).
-- This is intentional, but creates a risk of stale data when game names
-- are corrected in the catalog.
--
-- This trigger ensures corrections propagate automatically. It should fire
-- rarely (game names are stable) but provides insurance against stale data.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_game_name_to_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only run if name actually changed
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    -- Update listings
    UPDATE listings
    SET game_name = NEW.name, updated_at = NOW()
    WHERE bgg_game_id = NEW.id;

    -- Update wanted_listings
    UPDATE wanted_listings
    SET game_name = NEW.name, updated_at = NOW()
    WHERE bgg_game_id = NEW.id;

    RAISE NOTICE 'Synced game name change: % -> % (BGG ID: %)',
      OLD.name, NEW.name, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_game_names ON games;
CREATE TRIGGER sync_game_names
  AFTER UPDATE OF name ON games
  FOR EACH ROW
  EXECUTE FUNCTION sync_game_name_to_listings();

COMMENT ON FUNCTION sync_game_name_to_listings() IS
'Propagates game name changes to listings and wanted_listings tables.
Prevents stale denormalized data when game names are corrected in the catalog.
Fires rarely - game names are typically stable after initial import.';

COMMENT ON TRIGGER sync_game_names ON games IS
'Propagates rare game name corrections to denormalized listings/wanted_listings columns.
See: sync_game_name_to_listings() function.';
