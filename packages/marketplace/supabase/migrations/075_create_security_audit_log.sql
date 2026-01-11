-- Security audit log for compliance (PCI DSS, GDPR)
-- Captures security-relevant events with 1-year retention

CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);

-- Composite index for common queries (events by user in time range)
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_time
ON security_audit_log(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service role can write, users can read their own events

-- Service role has full access (used by audit-logger.ts)
-- No explicit policy needed - service role bypasses RLS

-- Users can read their own security events
CREATE POLICY "Users can read own security events"
ON security_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff can read all security events (for support/investigations)
CREATE POLICY "Staff can read all security events"
ON security_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_staff = true
  )
);

-- Comment on table
COMMENT ON TABLE security_audit_log IS 'Security events for compliance (PCI DSS 10.2, GDPR). Retention: 1 year (auto-purge via cron).';

-- Valid event types (for documentation, not enforced as enum for flexibility)
COMMENT ON COLUMN security_audit_log.event_type IS 'Event types: login, logout, failed_login, magic_link_sent, magic_link_used, magic_link_expired, oauth_login, rate_limit_hit, account_locked, admin_action, payment_processed, sensitive_data_accessed, suspicious_activity, unusual_login';

-- Function to clean up old audit logs (keep 1 year per PCI DSS requirement)
CREATE OR REPLACE FUNCTION cleanup_old_security_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_audit_log
  WHERE created_at < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Schedule weekly cleanup via pg_cron (Sunday at 3 AM UTC)
-- Note: Requires pg_cron extension (enabled in migration 052)
SELECT cron.schedule(
  'cleanup-security-audit-logs',
  '0 3 * * 0',  -- Every Sunday at 3 AM UTC
  $$SELECT cleanup_old_security_audit_logs()$$
);
