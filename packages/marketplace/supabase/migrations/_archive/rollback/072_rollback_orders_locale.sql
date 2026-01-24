-- Rollback Migration: Remove locale from orders table
-- Date: 2026-01-05
-- Rollback for: 072_add_orders_locale.sql

-- Drop index
DROP INDEX IF EXISTS idx_orders_locale;

-- Remove column
ALTER TABLE orders
DROP COLUMN IF EXISTS locale;
