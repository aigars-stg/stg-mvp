-- Remove expiration requirement from wanted listings
-- Listings remain active until user action (fulfilled, cancelled, or deleted)

-- 1. Make expires_at nullable and remove default (only if constraint exists)
DO $$
BEGIN
  -- Drop NOT NULL constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wanted_listings'
    AND column_name = 'expires_at'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE wanted_listings ALTER COLUMN expires_at DROP NOT NULL;
  END IF;

  -- Drop default if it exists
  ALTER TABLE wanted_listings ALTER COLUMN expires_at DROP DEFAULT;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Set existing expires_at to NULL for active listings (they won't expire)
UPDATE wanted_listings
SET expires_at = NULL
WHERE status = 'active';

-- 3. Remove the cron job for expiring wanted listings (if it exists)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-wanted-listings');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cron job expire-wanted-listings does not exist or could not be removed';
END $$;

-- 4. Update any expired listings back to active (user can cancel if needed)
UPDATE wanted_listings
SET status = 'active', updated_at = NOW()
WHERE status = 'expired';
