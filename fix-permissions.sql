-- =====================================================
-- FIX SUPABASE PERMISSIONS
-- This script fixes RLS policies for storage and database
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX STORAGE POLICIES FOR listing-photos BUCKET
-- =====================================================

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view uploaded files" ON storage.objects;

-- Create comprehensive storage policies
-- Allow authenticated users to INSERT (upload) to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to UPDATE their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to DELETE their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public SELECT (view) access to all files in listing-photos
CREATE POLICY "Anyone can view uploaded files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

-- =====================================================
-- 2. FIX LOGIN ACTIVITY TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own login activity" ON login_activity;
DROP POLICY IF EXISTS "Users can insert their own login activity" ON login_activity;

-- Create login_activity policies
-- Allow users to SELECT their own login records
CREATE POLICY "Users can view their own login activity"
ON login_activity FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to INSERT their own login records
CREATE POLICY "Users can insert their own login activity"
ON login_activity FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. VERIFY RLS IS ENABLED
-- =====================================================

-- Enable RLS on login_activity if not already enabled
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CHECK BUCKET CONFIGURATION
-- =====================================================

-- Ensure the listing-photos bucket exists and is properly configured
-- Run this to check if bucket exists:
SELECT * FROM storage.buckets WHERE id = 'listing-photos';

-- If bucket doesn't exist, create it:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('listing-photos', 'listing-photos', true);

-- =====================================================
-- 5. VERIFY POLICIES ARE WORKING
-- =====================================================

-- Check storage policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check login_activity policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'login_activity';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. After running, test avatar upload/delete in the app
-- 3. After running, test login activity fetch in the app
-- 4. If issues persist, check Supabase logs for specific errors
--
-- IMPORTANT: About Deleted Accounts and Listings
-- =====================================================
-- When a user deletes their account:
-- 1. Their listings are automatically marked as 'removed' (hidden from public)
-- 2. The RLS policy on listings only shows 'active' listings to the public
-- 3. The RLS policy on user_profiles excludes soft-deleted users (deleted_at IS NOT NULL)
-- 4. This means listings from deleted users will show seller as null
-- 5. The frontend handles this gracefully by showing "Deleted User"
--
-- If you're seeing listings from deleted accounts still visible:
-- - Make sure you actually deleted the account (not just closed the modal)
-- - Check the listing status: SELECT id, status FROM listings WHERE seller_id = '<user_id>';
-- - The status should be 'removed' for deleted user's listings
-- =====================================================
