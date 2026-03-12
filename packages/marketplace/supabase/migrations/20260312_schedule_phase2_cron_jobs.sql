-- ============================================================================
-- Phase 2: Schedule high-priority cron jobs
-- Auction Edge Functions (already deployed), shipping reminders, account cleanup
-- ============================================================================

-- 1. Process ended auctions — determines winners, sends emails + notifications
SELECT cron.schedule(
  'process-ended-auctions',
  '* * * * *',
  $$SELECT call_edge_function('cron-process-auctions')$$
);

-- 2. Expire unpaid auction wins (48h deadline)
SELECT cron.schedule(
  'expire-auction-payments',
  '*/5 * * * *',
  $$SELECT call_edge_function('cron-expire-auction-payments')$$
);

-- 3. Auction ending soon notifications (60min warning)
SELECT cron.schedule(
  'auction-ending-soon',
  '*/15 * * * *',
  $$SELECT call_edge_function('cron-auction-ending-soon')$$
);

-- 4. Shipping reminders (24h after acceptance, no tracking)
SELECT cron.schedule(
  'shipping-reminders',
  '0 */6 * * *',
  $$SELECT call_edge_function('cron-shipping-reminders')$$
);

-- 5. GDPR account cleanup (soft-deleted > 90 days)
-- Unschedule first in case it exists from consolidated schema
SELECT cron.unschedule('cleanup-deleted-accounts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-deleted-accounts');

SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 2 * * *',
  $$SELECT call_edge_function('cron-cleanup-accounts')$$
);
