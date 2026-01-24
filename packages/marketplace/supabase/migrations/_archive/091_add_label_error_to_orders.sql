-- Add label_error column to orders table
-- This stores any error message from Unisend label generation failures
-- Allows debugging and showing error messages to sellers

ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_error TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN orders.label_error IS 'Stores error message if Unisend label generation failed';
