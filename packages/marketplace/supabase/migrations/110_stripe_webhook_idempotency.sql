-- Migration: 110_stripe_webhook_idempotency.sql
-- Purpose: Add idempotency tracking for Stripe webhook events
-- PRD Reference: Section 8.7

-- ============================================================================
-- STRIPE WEBHOOK EVENTS TABLE
-- Tracks processed webhook events to prevent duplicate processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,                    -- Stripe event ID (evt_xxx)
  type TEXT NOT NULL,                     -- Event type (checkout.session.completed, etc.)
  source TEXT DEFAULT 'platform',         -- 'platform' or 'connect'
  payload JSONB,                          -- Full event data for debugging
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()    -- For cleanup queries (90-day retention)
);

-- Index for cleanup queries (delete events older than 90 days)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at
ON stripe_webhook_events(created_at);

-- Index for source filtering (if needed for analytics)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_source
ON stripe_webhook_events(source);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Only service role can access (webhooks run with service role)
-- ============================================================================

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for webhook handlers)
CREATE POLICY stripe_webhook_events_service_all ON stripe_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE stripe_webhook_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN stripe_webhook_events.id IS 'Stripe event ID (evt_xxx) - used as primary key for deduplication';
COMMENT ON COLUMN stripe_webhook_events.type IS 'Stripe event type (e.g., checkout.session.completed)';
COMMENT ON COLUMN stripe_webhook_events.source IS 'Webhook source: platform (your account) or connect (connected accounts)';
COMMENT ON COLUMN stripe_webhook_events.payload IS 'Full event payload for debugging and audit purposes';
COMMENT ON COLUMN stripe_webhook_events.processed_at IS 'When the event was processed by our handler';
COMMENT ON COLUMN stripe_webhook_events.created_at IS 'When this record was inserted (for cleanup scheduling)';
