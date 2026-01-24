-- Migration: Schedule Edge Functions via pg_cron + pg_net
-- Purpose: Call Supabase Edge Functions for jobs requiring external API calls
-- Date: 2024-12-18
--
-- IMPORTANT: Before running this migration:
-- 1. Go to Supabase Dashboard → Project Settings → Vault
-- 2. Create a secret named 'service_role_key' with your service role key value

-- ============================================================================
-- FUNCTION: call_edge_function
-- Purpose: Helper to call Edge Functions with proper authentication
-- Uses Vault to securely retrieve service role key
-- ============================================================================
CREATE OR REPLACE FUNCTION call_edge_function(function_name TEXT)
RETURNS BIGINT AS $$
DECLARE
  v_service_key TEXT;
  v_request_id BIGINT;
  -- Project URL hardcoded (Supabase doesn't allow ALTER DATABASE SET for custom params)
  v_project_url CONSTANT TEXT := 'https://ettbijaifahenypkmsts.supabase.co';
BEGIN
  -- Get service role key from Vault
  -- Vault must have a secret named 'service_role_key'
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" not found. Please create it in Supabase Dashboard → Project Settings → Vault.';
  END IF;

  -- Make HTTP POST request to Edge Function
  SELECT net.http_post(
    url := v_project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'triggered_at', NOW()::TEXT
    )
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search_path for security
ALTER FUNCTION call_edge_function(TEXT) SET search_path = public, extensions, net, vault;

COMMENT ON FUNCTION call_edge_function IS
  'Helper function to call Supabase Edge Functions via pg_net with Vault-stored credentials';

-- ============================================================================
-- SCHEDULE: Edge Function cron jobs
-- These jobs call Edge Functions for tasks requiring external APIs
-- All times are in UTC
-- ============================================================================

-- Job 4: Expire seller deadlines (every 5 minutes)
-- Cancels orders where sellers haven't responded within 24 hours
-- Processes Stripe refunds and sends cancellation emails
SELECT cron.schedule(
  'expire-seller-deadlines',
  '*/5 * * * *',
  $$SELECT call_edge_function('cron-expire-seller-deadlines')$$
);

-- Job 5: Sync tracking (every 30 minutes)
-- Fetches tracking updates from Unisend API for T2T shipments
-- Sends delivery notification emails when packages arrive
SELECT cron.schedule(
  'sync-tracking',
  '*/30 * * * *',
  $$SELECT call_edge_function('cron-sync-tracking')$$
);

-- Job 6: Process payouts (daily at 4:00 AM UTC)
-- Creates Stripe Connect transfers to sellers for completed orders
SELECT cron.schedule(
  'process-payouts',
  '0 4 * * *',
  $$SELECT call_edge_function('cron-process-payouts')$$
);

-- Job 7: Cleanup deleted accounts (daily at 2:00 AM UTC)
-- Permanently deletes soft-deleted accounts after 90-day GDPR retention period
-- Removes storage files and auth users
SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 2 * * *',
  $$SELECT call_edge_function('cron-cleanup-accounts')$$
);

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
-- After migration, verify all 7 jobs are scheduled:
-- SELECT jobid, jobname, schedule, command FROM cron.job ORDER BY jobname;
--
-- Expected jobs:
-- 1. cleanup-deleted-accounts    0 2 * * *
-- 2. complete-delivered-orders   0 1 * * *
-- 3. expire-reservations         * * * * *
-- 4. expire-seller-deadlines     */5 * * * *
-- 5. expire-wanted-listings      0 3 * * *
-- 6. process-payouts             0 4 * * *
-- 7. sync-tracking               */30 * * * *
