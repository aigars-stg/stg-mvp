-- Set database timezone to Europe/Riga (UTC+2 standard, UTC+3 during DST)
-- Note: PostgreSQL TIMESTAMPTZ still stores values in UTC internally,
-- but NOW() will return timestamps in Riga timezone

-- Important: On Supabase, you need to set this in the Dashboard:
-- Settings > Database > Timezone > Europe/Riga

-- For local development, set timezone for current session
SET timezone TO 'Europe/Riga';

-- Create helper function to always return Riga time
CREATE OR REPLACE FUNCTION riga_now()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW() AT TIME ZONE 'Europe/Riga';
END;
$$ LANGUAGE plpgsql STABLE;

-- Comment explaining timezone handling
COMMENT ON FUNCTION riga_now() IS 'Returns current timestamp in Europe/Riga timezone. Use this instead of NOW() for consistency.';

-- Note: All TIMESTAMPTZ columns store in UTC internally (PostgreSQL best practice),
-- but with timezone set to Europe/Riga:
-- - NOW() returns Riga time
-- - Timestamps are displayed in Riga time
-- - No code changes needed in application
