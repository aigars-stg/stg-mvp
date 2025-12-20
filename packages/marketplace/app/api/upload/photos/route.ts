import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { processImageForUpload } from '@/lib/image-processing';

const BUCKET_NAME = 'listing-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(request: NextRequest) {
  try {
    console.log('📸 [Photo Upload] Starting photo upload...');

    // Create Supabase client with cookies for auth
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [Photo Upload] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'You must be signed in to upload photos' },
        { status: 401 }
      );
    }

    console.log(`📸 [Photo Upload] User authenticated: ${user.id}`);

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    if (files.length > 8) {
      return NextResponse.json({ error: 'Maximum 8 photos allowed' }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 5MB` },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} has invalid type. Only JPEG, PNG, WebP, and AVIF are allowed` },
          { status: 400 }
        );
      }
    }

    const uploadedUrls: string[] = [];

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // All processed images will be WebP format
      const fileName = `${randomUUID()}.webp`;
      // Organize files by user ID
      const filePath = `${user.id}/${fileName}`;

      console.log(`📸 [Photo Upload] Uploading file ${i + 1}/${files.length}: ${file.name}`);

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);

      // Process image: compress, resize if needed, strip ALL metadata (GPS, EXIF, XMP, IPTC, ICC)
      let processedBuffer: Buffer;
      let contentType = 'image/webp';
      try {
        const result = await processImageForUpload(originalBuffer);
        processedBuffer = result.buffer;

        console.log(`🖼️ [Photo Upload] Processed ${file.name}:`, {
          originalSize: `${(result.originalSize / 1024).toFixed(1)}KB`,
          processedSize: `${(result.processedSize / 1024).toFixed(1)}KB`,
          compression: `${result.compressionRatio.toFixed(1)}x`,
          dimensions: `${result.width}x${result.height}`,
          wasResized: result.wasResized,
        });
      } catch (processingError) {
        console.error(`⚠️ [Photo Upload] Failed to process image:`, processingError);
        // Fallback: use original buffer if processing fails
        processedBuffer = originalBuffer;
        contentType = file.type;
      }

      // Upload to Supabase Storage
      const { error } = await (supabase as any).storage
        .from(BUCKET_NAME)
        .upload(filePath, processedBuffer, {
          contentType,
          cacheControl: '31536000', // 1 year cache (immutable content)
          upsert: false,
        });

      if (error) {
        console.error(`❌ [Photo Upload] Upload failed for ${file.name}:`, error);

        // Clean up already uploaded files
        if (uploadedUrls.length > 0) {
          console.log('🧹 [Photo Upload] Cleaning up previously uploaded files...');
          const uploadedPaths = uploadedUrls.map(url => {
            const urlParts = url.split('/');
            return urlParts[urlParts.length - 1];
          });
          await (supabase as any).storage.from(BUCKET_NAME).remove(uploadedPaths);
        }

        return NextResponse.json(
          { error: `Failed to upload ${file.name}`, details: error.message },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = (supabase as any).storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error(`❌ [Photo Upload] Failed to get public URL for ${file.name}`);
        return NextResponse.json(
          { error: `Failed to get public URL for ${file.name}` },
          { status: 500 }
        );
      }

      uploadedUrls.push(urlData.publicUrl);
      console.log(`✅ [Photo Upload] Uploaded: ${urlData.publicUrl}`);
    }

    console.log(`✅ [Photo Upload] Successfully uploaded ${uploadedUrls.length} photos`);

    return NextResponse.json({
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error: any) {
    console.error('❌ [Photo Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photos', details: error.message },
      { status: 500 }
    );
  }
}
