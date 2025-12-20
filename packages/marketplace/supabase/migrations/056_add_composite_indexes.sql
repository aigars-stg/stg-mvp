-- Migration: Add composite indexes for performance optimization
-- Description: Add composite indexes for common query patterns in seller dashboard
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) since migrations run in transactions

-- Composite index for seller dashboard queries that filter orders by seller and status
-- Common query pattern: WHERE seller_id = ? AND status NOT IN (...)
CREATE INDEX IF NOT EXISTS idx_orders_seller_status
ON orders(seller_id, status);

-- Composite index for payout transactions by seller and status
-- Common query pattern: WHERE seller_id = ? AND status = 'pending'
CREATE INDEX IF NOT EXISTS idx_payout_transactions_seller_status
ON payout_transactions(seller_id, status);

-- Partial index for active listings with seller (for seller dashboard)
-- Common query pattern: WHERE seller_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_listings_seller_active
ON listings(seller_id, created_at DESC)
WHERE status = 'active';
