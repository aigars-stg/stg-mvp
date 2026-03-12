-- ============================================================================
-- Phase 1: Schedule all launch-blocker cron jobs
--
-- Unschedules any stale/deprecated jobs from the consolidated schema,
-- then schedules the 5 Phase 1 jobs.
-- ============================================================================

-- Clean up deprecated/duplicate jobs that may exist from consolidated schema
SELECT cron.unschedule('expire-seller-deadlines') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-seller-deadlines');
SELECT cron.unschedule('sync-tracking') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-tracking');
SELECT cron.unschedule('process-payouts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-payouts');
SELECT cron.unschedule('cleanup-deleted-accounts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-deleted-accounts');

-- 1. Expire seller deadlines — Edge Function (handles refunds, emails, notifications)
SELECT cron.schedule(
  'expire-seller-deadlines',
  '*/5 * * * *',
  $$SELECT call_edge_function('cron-expire-seller-deadlines')$$
);

-- 2. Expire shipping deadlines — Pure SQL (wallet refunds + notifications; EveryPay via safety net)
SELECT cron.schedule(
  'expire-shipping-deadlines',
  '*/5 * * * *',
  $$SELECT handle_expired_shipping_deadlines()$$
);

-- 3. Escalate expired disputes — Pure SQL
SELECT cron.schedule(
  'escalate-expired-disputes',
  '*/15 * * * *',
  $$SELECT escalate_expired_disputes()$$
);

-- 4. Sync tracking — Edge Function (already deployed, just needs schedule)
SELECT cron.schedule(
  'sync-tracking',
  '*/30 * * * *',
  $$SELECT call_edge_function('cron-sync-tracking')$$
);

-- 5. Refund safety net — Edge Function (sweeps for missed refunds)
SELECT cron.schedule(
  'refund-safety-net',
  '*/10 * * * *',
  $$SELECT call_edge_function('cron-refund-safety-net')$$
);
