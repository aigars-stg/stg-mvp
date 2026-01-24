-- Migration: Admin Login Activity View
-- Purpose: Provide admin visibility into login patterns for security monitoring
-- Created: 2026-01-24

-- ============================================================================
-- VIEW: admin_login_activity_summary
-- Aggregates login activity per user for the last 30 days
-- ============================================================================

CREATE VIEW admin_login_activity_summary AS
SELECT
  user_id,
  COUNT(*) as total_logins,
  MAX(created_at) as last_login,
  MIN(created_at) as first_login,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT country) as unique_countries,
  array_agg(DISTINCT country) FILTER (WHERE country IS NOT NULL) as countries
FROM login_activity
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- Views inherit RLS from base tables
-- login_activity has: "Users can read own login activity" (user_id check)
-- Staff can read all via is_staff() function
COMMENT ON VIEW admin_login_activity_summary IS
  'Aggregated login activity per user (last 30 days).
   Staff use only - regular users see only their own activity via RLS.
   Columns: user_id, total_logins, last_login, first_login, unique_ips, unique_countries, countries[]';

-- ============================================================================
-- FUNCTION: get_suspicious_login_activity
-- Returns users with unusual login patterns (multiple IPs/countries)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_suspicious_login_activity(
  p_days INTEGER DEFAULT 7,
  p_min_unique_ips INTEGER DEFAULT 5
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  total_logins BIGINT,
  unique_ips BIGINT,
  unique_countries BIGINT,
  countries TEXT[],
  last_login TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    la.user_id,
    up.email,
    COUNT(*) as total_logins,
    COUNT(DISTINCT la.ip_address) as unique_ips,
    COUNT(DISTINCT la.country) as unique_countries,
    array_agg(DISTINCT la.country) FILTER (WHERE la.country IS NOT NULL),
    MAX(la.created_at)
  FROM login_activity la
  JOIN user_profiles up ON la.user_id = up.id
  WHERE la.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND up.deleted_at IS NULL
  GROUP BY la.user_id, up.email
  HAVING COUNT(DISTINCT la.ip_address) >= p_min_unique_ips
  ORDER BY COUNT(DISTINCT la.ip_address) DESC;
$$;

COMMENT ON FUNCTION get_suspicious_login_activity(INTEGER, INTEGER) IS
  'Returns users with suspicious login patterns (multiple IPs/countries).

   PARAMETERS:
   - p_days: Number of days to look back (default: 7)
   - p_min_unique_ips: Minimum unique IPs to flag as suspicious (default: 5)

   RETURNS: Table of (user_id, email, total_logins, unique_ips, unique_countries, countries[], last_login)

   WARNING: This function performs a full table scan with aggregation.
   - Staff-only access (caller should check is_staff() before calling)
   - NOT for frequent API calls - intended for occasional admin review
   - If exposed via API, implement caching (e.g., 15-minute TTL)
   - Consider materialized view if daily reports needed

   SECURITY: SECURITY DEFINER runs as function owner, not caller.
   RLS is bypassed - ensure caller authorization before invoking.';

-- Grant execute to authenticated users (caller must check is_staff())
GRANT EXECUTE ON FUNCTION get_suspicious_login_activity(INTEGER, INTEGER) TO authenticated;
