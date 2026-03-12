-- ============================================================================
-- Phase 3: Schedule maintenance cron jobs
-- Login activity cleanup + reservation safety net
-- ============================================================================

-- 1. Clean up old login activity records (weekly, Sunday 4am UTC)
SELECT cron.schedule(
  'cleanup-login-activity',
  '0 4 * * 0',
  $$SELECT cleanup_old_login_activity()$$
);

-- 2. Release stale reservations — broader than cleanup_expired_cart_items()
-- Catches any listing with reserved_until < NOW() regardless of basket linkage
SELECT cron.schedule(
  'release-stale-reservations',
  '*/10 * * * *',
  $$SELECT release_expired_reservations()$$
);
