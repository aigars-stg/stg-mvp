-- Add recovery codes for account recovery (email compromise protection)
-- Recovery codes are single-use backup codes generated on signup

-- Add columns for recovery codes
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS recovery_codes TEXT[],
ADD COLUMN IF NOT EXISTS recovery_codes_generated_at TIMESTAMPTZ;

-- Comment on columns
COMMENT ON COLUMN user_profiles.recovery_codes IS 'Encrypted backup recovery codes (8 codes, single-use). Generated on signup, regenerated on request.';
COMMENT ON COLUMN user_profiles.recovery_codes_generated_at IS 'When recovery codes were last generated';

-- Update RLS policy to allow users to update their own recovery codes
-- (Existing UPDATE policy should cover this as it allows users to update their own profile)

-- Function to consume a recovery code (validates and removes from array)
-- Returns true if code was valid and consumed, false otherwise
CREATE OR REPLACE FUNCTION consume_recovery_code(
  target_user_id UUID,
  code_to_use TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_codes TEXT[];
  code_index INT;
  normalized_code TEXT;
BEGIN
  -- Normalize code (uppercase, remove dashes/spaces)
  normalized_code := UPPER(REGEXP_REPLACE(code_to_use, '[^A-Z0-9]', '', 'g'));

  -- Get user's current codes
  SELECT recovery_codes INTO user_codes
  FROM user_profiles
  WHERE id = target_user_id;

  -- Check if user has codes
  IF user_codes IS NULL OR array_length(user_codes, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Find the code in the array (case-insensitive match)
  code_index := array_position(user_codes, normalized_code);

  -- Code not found
  IF code_index IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Remove the used code from the array
  user_codes := array_remove(user_codes, normalized_code);

  -- Update the user's codes
  UPDATE user_profiles
  SET recovery_codes = user_codes
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION consume_recovery_code TO authenticated;
