-- Create storage bucket for order-related documents (shipping labels, etc.)
-- Note: Storage policies must be created via Supabase Dashboard due to permissions

-- ============================================
-- Create bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-documents',
  'order-documents',
  true, -- Public for easy access to labels
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- IMPORTANT: Manual Step Required
-- ============================================
-- Storage RLS policies cannot be created via migrations.
-- After running this migration, go to Supabase Dashboard:
-- Storage > order-documents > Policies
--
-- Create the following policies:
--
-- 1. Name: "Public read access"
--    Operation: SELECT
--    Policy definition:
--    bucket_id = 'order-documents'
--
-- This allows public read access since the bucket is public anyway.
