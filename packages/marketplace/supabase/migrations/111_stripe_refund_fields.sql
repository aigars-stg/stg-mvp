-- Migration: 111_stripe_refund_fields.sql
-- Purpose: Add fields for tracking refunds and transfer reversals
-- PRD Reference: Section 5.4, Section 6.1

-- ============================================================================
-- REFUND TRACKING COLUMNS
-- Track Stripe refund and transfer reversal IDs for post-transfer refunds
-- ============================================================================

-- Add stripe_refund_id to track refund reference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);

-- Add stripe_transfer_reversal_id for post-transfer refund scenarios
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_transfer_reversal_id VARCHAR(255);

-- Add refund_amount column if it doesn't exist (for partial refunds)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for refund lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_refund_id
ON orders(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN orders.stripe_refund_id IS 'Stripe refund ID (re_xxx) for tracking refund status';
COMMENT ON COLUMN orders.stripe_transfer_reversal_id IS 'Stripe transfer reversal ID (trr_xxx) when refunding after transfer to seller';
COMMENT ON COLUMN orders.refund_amount IS 'Refund amount in EUR (for partial refunds, null means full refund)';
