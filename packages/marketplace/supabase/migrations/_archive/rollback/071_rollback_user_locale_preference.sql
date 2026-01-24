-- Rollback Migration: Remove preferred_locale from user_profiles
-- Date: 2026-01-05
-- Rollback for: 071_add_user_locale_preference.sql

-- Drop index
DROP INDEX IF EXISTS idx_user_profiles_preferred_locale;

-- Remove column
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS preferred_locale;

-- Restore original handle_new_user trigger (without locale support)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
