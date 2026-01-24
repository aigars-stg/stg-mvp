-- Add timestamp fields for status tracking
-- This migration adds sold_at and removed_at columns to track when listings change status

-- Add sold_at column to track when listing was marked as sold
ALTER TABLE listings
ADD COLUMN sold_at TIMESTAMP WITH TIME ZONE;

-- Add removed_at column to track when listing was removed/archived
ALTER TABLE listings
ADD COLUMN removed_at TIMESTAMP WITH TIME ZONE;

-- Create function to automatically update status timestamps
CREATE OR REPLACE FUNCTION update_listing_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'sold', set sold_at
  IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
    NEW.sold_at = NOW();
  END IF;

  -- When status changes from 'sold' to something else, clear sold_at
  IF OLD.status = 'sold' AND NEW.status != 'sold' THEN
    NEW.sold_at = NULL;
  END IF;

  -- When status changes to 'removed', set removed_at
  IF NEW.status = 'removed' AND (OLD.status IS NULL OR OLD.status != 'removed') THEN
    NEW.removed_at = NOW();
  END IF;

  -- When status changes from 'removed' to something else, clear removed_at
  IF OLD.status = 'removed' AND NEW.status != 'removed' THEN
    NEW.removed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update status timestamps on status change
CREATE TRIGGER update_listing_status_timestamps
  BEFORE UPDATE ON listings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_listing_status_timestamps();

-- Add comments for documentation
COMMENT ON COLUMN listings.sold_at IS 'Timestamp when listing was marked as sold';
COMMENT ON COLUMN listings.removed_at IS 'Timestamp when listing was removed/archived';
