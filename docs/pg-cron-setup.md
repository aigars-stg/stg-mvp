# Supabase pg_cron Setup Guide

This document describes the scheduled job infrastructure for Second Turn Games marketplace.

## Overview

We use **Supabase pg_cron** instead of Vercel Cron Jobs to overcome the Hobby plan's 2-job limit. Jobs are scheduled directly in PostgreSQL and can call either:
- **SQL functions** (for pure database operations)
- **Edge Functions** via pg_net (for tasks requiring external APIs)

## Scheduled Jobs

| Job | Schedule | Type | Purpose |
|-----|----------|------|---------|
| expire-reservations | Every minute | SQL | Release expired cart items (30-min timeout) |
| expire-wanted-listings | Daily 3 AM UTC | SQL | Mark 30-day old ISO listings as expired |
| complete-delivered-orders | Daily 1 AM UTC | SQL | Auto-complete orders 3 days after delivery |
| expire-seller-deadlines | Every 5 minutes | Edge Function | Cancel orders with 24h expired deadlines, process Stripe refunds, send emails |
| sync-tracking | Every 30 minutes | Edge Function | Fetch Unisend tracking, update order status, send delivery emails |
| process-payouts | Daily 4 AM UTC | Edge Function | Create Stripe Connect transfers for completed orders |
| cleanup-deleted-accounts | Daily 2 AM UTC | Edge Function | Permanently delete accounts after 90-day GDPR retention |

## Monitoring

### View Job Run History

```sql
-- Recent job runs (last 20)
SELECT
  jobname,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### View All Scheduled Jobs

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job
ORDER BY jobname;
```

### Check for Failed Jobs

```sql
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

### View Edge Function Logs

1. Go to **Supabase Dashboard → Edge Functions**
2. Click on a function (e.g., `cron-expire-seller-deadlines`)
3. View **Logs** tab for execution details and errors

## Managing Jobs

### Temporarily Disable a Job

```sql
-- Unschedule (removes the job)
SELECT cron.unschedule('job-name');

-- To re-enable, run the schedule command again from the migration
```

### Change Job Schedule

```sql
-- First unschedule
SELECT cron.unschedule('expire-reservations');

-- Then reschedule with new timing (e.g., every 2 minutes instead of every minute)
SELECT cron.schedule(
  'expire-reservations',
  '*/2 * * * *',
  $$SELECT cleanup_expired_cart_items()$$
);
```

### Manually Trigger a Job

```sql
-- SQL jobs - just call the function directly
SELECT cleanup_expired_cart_items();
SELECT expire_wanted_listings();
SELECT complete_delivered_orders();

-- Edge Function jobs - call the helper function
SELECT call_edge_function('cron-expire-seller-deadlines');
SELECT call_edge_function('cron-sync-tracking');
SELECT call_edge_function('cron-process-payouts');
SELECT call_edge_function('cron-cleanup-accounts');
```

## Architecture

```
pg_cron scheduler
    │
    ├── Pure SQL Jobs (3)
    │   └── Directly call PostgreSQL functions
    │
    └── Edge Function Jobs (4)
        └── call_edge_function() helper
            └── pg_net HTTP POST to Edge Function
                └── Edge Function executes with:
                    - Supabase client (database)
                    - Stripe SDK (payments)
                    - Resend SDK (emails)
                    - Unisend API (tracking)
```

## Key Files

### SQL Migrations
- `supabase/migrations/052_enable_pg_cron.sql` - Enables pg_cron and pg_net extensions
- `supabase/migrations/053_pg_cron_setup.sql` - SQL functions + pure cron schedules
- `supabase/migrations/054_schedule_edge_functions.sql` - Edge Function scheduler

### Edge Functions
- `supabase/functions/cron-expire-seller-deadlines/index.ts`
- `supabase/functions/cron-sync-tracking/index.ts`
- `supabase/functions/cron-process-payouts/index.ts`
- `supabase/functions/cron-cleanup-accounts/index.ts`

### Legacy API Routes (kept for manual testing)
- `app/api/cron/expire-reservations/route.ts`
- `app/api/cron/expire-seller-deadlines/route.ts`
- `app/api/cron/expire-wanted-listings/route.ts`
- `app/api/cron/sync-tracking/route.ts`
- `app/api/cron/complete-delivered-orders/route.ts`
- `app/api/cron/process-payouts/route.ts`
- `app/api/auth/cleanup-deleted-accounts/route.ts`

## Secrets & Configuration

### Supabase Vault (Database)
| Secret | Purpose |
|--------|---------|
| `service_role_key` | Used by `call_edge_function()` to authenticate with Edge Functions |

**To rotate:** Dashboard → Project Settings → Vault → Edit secret

### Edge Function Secrets
| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Stripe API for refunds and payouts |
| `RESEND_API_KEY` | Email sending |
| `APP_URL` | Base URL for email links |
| `UNISEND_API_URL` | Tracking API endpoint |
| `UNISEND_USERNAME` | Tracking API auth |
| `UNISEND_PASSWORD` | Tracking API auth |

**To update:** `supabase secrets set KEY=value` or Dashboard → Edge Functions → Secrets

### Hardcoded Values
| Location | Value | Note |
|----------|-------|------|
| `054_schedule_edge_functions.sql:20` | Project URL | Update if changing Supabase projects |

## Troubleshooting

### Job Shows "failed" Status

1. Check `return_message` in `cron.job_run_details`
2. For Edge Functions, check function logs in Supabase Dashboard
3. Common issues:
   - Missing Vault secret → Create `service_role_key` in Vault
   - Missing Edge Function secrets → Set via `supabase secrets set`
   - Function not deployed → Run `supabase functions deploy`

### Edge Function Not Being Called

1. Verify `call_edge_function()` exists: `\df call_edge_function`
2. Check Vault secret exists: `SELECT name FROM vault.decrypted_secrets;`
3. Test manually: `SELECT call_edge_function('cron-sync-tracking');`
4. Check pg_net is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`

### Jobs Not Running at All

1. Verify pg_cron is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Check jobs are scheduled: `SELECT * FROM cron.job;`
3. Verify database has correct permissions (should be automatic on Supabase)

## Deployment

### Deploy Edge Functions
```bash
cd packages/marketplace
supabase functions deploy cron-expire-seller-deadlines
supabase functions deploy cron-sync-tracking
supabase functions deploy cron-process-payouts
supabase functions deploy cron-cleanup-accounts
```

### Apply Migration Changes
```bash
supabase db push
```

### Set Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_xxx
supabase secrets set RESEND_API_KEY=re_xxx
# ... etc
```

## Cron Expression Reference

| Expression | Meaning |
|------------|---------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 1 * * *` | Daily at 1:00 AM UTC |
| `0 2 * * *` | Daily at 2:00 AM UTC |
| `0 3 * * *` | Daily at 3:00 AM UTC |
| `0 4 * * *` | Daily at 4:00 AM UTC |

Format: `minute hour day-of-month month day-of-week`

---

*Last updated: December 2024*
*Migration from Vercel Cron to Supabase pg_cron*
