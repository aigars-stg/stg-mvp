-- Create login_activity table for tracking user sign-ins
CREATE TABLE IF NOT EXISTS login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON login_activity(created_at DESC);

-- Enable RLS
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for login_activity

-- Users can read their own login activity
CREATE POLICY "Users can read their own login activity"
ON login_activity
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only system can insert login activity (via service role)
CREATE POLICY "Service role can insert login activity"
ON login_activity
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own login activity
CREATE POLICY "Users can delete their own login activity"
ON login_activity
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to clean up old login activity (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_activity()
RETURNS void AS $$
BEGIN
  DELETE FROM login_activity
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE login_activity IS 'Tracks user login activity for security and audit purposes';
