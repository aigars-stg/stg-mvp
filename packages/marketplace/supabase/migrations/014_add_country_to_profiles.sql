-- Migration: Add country field to user_profiles
-- Description: Adds country selection for marketplace covering Latvia, Estonia, Lithuania, and Other

-- Add country column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN country TEXT CHECK (country IN ('LV', 'EE', 'LT', 'OTHER'));

-- Update the handle_new_user trigger function to include country from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    email,
    phone,
    country,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Comment on the column
COMMENT ON COLUMN user_profiles.country IS 'User country code: LV (Latvia), EE (Estonia), LT (Lithuania), OTHER';
