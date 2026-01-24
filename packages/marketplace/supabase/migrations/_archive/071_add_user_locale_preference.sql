-- Migration: Add preferred_locale to user_profiles
-- Date: 2026-01-05
-- Purpose: Support user language preference for i18n

-- Add preferred_locale column with default 'en'
ALTER TABLE user_profiles
ADD COLUMN preferred_locale TEXT DEFAULT 'en'
CHECK (preferred_locale IN ('en', 'lv'));

-- Create index for efficient locale-based queries
CREATE INDEX idx_user_profiles_preferred_locale ON user_profiles(preferred_locale);

-- Update existing users to have 'en' as default locale
UPDATE user_profiles
SET preferred_locale = 'en'
WHERE preferred_locale IS NULL;

-- Update the handle_new_user trigger to include locale from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    email,
    preferred_locale
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'en')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.preferred_locale IS 'User preferred language: en (English) or lv (Latvian)';
