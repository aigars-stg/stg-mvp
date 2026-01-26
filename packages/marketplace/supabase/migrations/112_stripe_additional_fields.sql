-- Migration: 112_stripe_additional_fields.sql
-- Purpose: Add additional Stripe reference columns for better tracking
-- PRD Reference: Section 6.1

-- ============================================================================
-- ADDITIONAL STRIPE REFERENCE COLUMNS
-- ============================================================================

-- Add stripe_checkout_session_id for audit trail
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

-- Add stripe_transfer_group for correlating charges with transfers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_transfer_group VARCHAR(255);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for checkout session lookups (useful for debugging/support)
CREATE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id
ON orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- Index for transfer group lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_transfer_group
ON orders(stripe_transfer_group) WHERE stripe_transfer_group IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN orders.stripe_checkout_session_id IS 'Stripe Checkout Session ID (cs_xxx) for audit trail';
COMMENT ON COLUMN orders.stripe_transfer_group IS 'Transfer group ID to correlate charge with transfer (e.g., BASKET_uuid)';
