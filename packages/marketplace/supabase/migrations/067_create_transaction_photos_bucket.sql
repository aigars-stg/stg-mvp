-- Create storage bucket for transaction message photos
-- These are photos attached to messages in transaction conversations
-- Used for sharing condition photos, proof of shipment, etc.

-- ============================================
-- Create bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-photos',
  'transaction-photos',
  true, -- Public for easy access (RLS via messages table controls access)
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- IMPORTANT: Manual Step Required
-- ============================================
-- Storage RLS policies cannot be created via migrations.
-- After running this migration, go to Supabase Dashboard:
-- Storage > transaction-photos > Policies
--
-- Create the following policies:
--
-- 1. Name: "Authenticated users can upload"
--    Operation: INSERT
--    Policy definition:
--    bucket_id = 'transaction-photos' AND auth.role() = 'authenticated'
--
-- 2. Name: "Public read access"
--    Operation: SELECT
--    Policy definition:
--    bucket_id = 'transaction-photos'
--
-- 3. Name: "Users can delete their own uploads"
--    Operation: DELETE
--    Policy definition:
--    bucket_id = 'transaction-photos' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- Note: Access control is handled at the message level - only conversation
-- participants can see messages with photo_urls, so public read on storage is acceptable.
