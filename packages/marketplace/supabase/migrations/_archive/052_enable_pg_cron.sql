-- Migration: Enable pg_cron and pg_net extensions
-- Purpose: Setup infrastructure for scheduled jobs via Supabase pg_cron
-- Date: 2024-12-18

-- Enable pg_cron extension for scheduled jobs
-- Note: pg_cron is pre-installed on Supabase but needs to be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP calls to Edge Functions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for scheduled marketplace tasks';
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL - used to call Edge Functions from pg_cron';
