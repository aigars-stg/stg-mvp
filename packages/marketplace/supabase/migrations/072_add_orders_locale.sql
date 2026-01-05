-- Migration: Add locale to orders table
-- Date: 2026-01-05
-- Purpose: Store buyer's locale at purchase time for order-related emails

-- Add locale column to capture buyer's language preference at checkout
ALTER TABLE orders
ADD COLUMN locale TEXT DEFAULT 'en'
CHECK (locale IN ('en', 'lv'));

-- Create index for efficient locale-based queries
CREATE INDEX idx_orders_locale ON orders(locale);

-- Update existing orders to have 'en' as default locale
UPDATE orders
SET locale = 'en'
WHERE locale IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.locale IS 'Buyer locale at time of purchase (used for order confirmation emails, shipping notifications, etc.)';
