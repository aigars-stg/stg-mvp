-- Create storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by Supabase
-- We just need to create policies for our bucket

-- Policy: Authenticated users can upload to their own folder
-- Files are organized as: {user_id}/{filename}
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public can read all listing photos
CREATE POLICY "Public can read listing photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

-- Policy: Users can update their own photos
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
