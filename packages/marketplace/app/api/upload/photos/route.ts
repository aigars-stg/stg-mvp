import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { processImageForUpload } from '@/lib/image-processing';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { checkRateLimit, getRateLimitAction } from '@/lib/ratelimit';
import type { TypedSupabase } from '@/lib/supabase/query-types';

const BUCKET_NAME = 'listing-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Check seller status for rate limit tier
    const { data: profile } = await (supabase as TypedSupabase)
      .from('seller_profiles')
      .select('seller_status')
      .eq('id', user.id)
      .single();
    const isSeller = profile?.seller_status === 'active';

    // Rate limit: 100/hour for sellers, 10/hour for buyers
    const rateLimitResult = await checkRateLimit(getRateLimitAction('upload', isSeller), user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error, reset: rateLimitResult.reset },
        { status: 429 }
      );
    }

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
          { error: `File ${file.name} exceeds maximum size of 10MB` },
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
    const uploadedPaths: string[] = []; // Track storage paths for cleanup on failure

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // All processed images will be WebP format
      const fileName = `${randomUUID()}.webp`;
      // Organize files by user ID
      const filePath = `${user.id}/${fileName}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);

      // Process image: compress, resize if needed, strip ALL metadata (GPS, EXIF, XMP, IPTC, ICC)
      let processedBuffer: Buffer;
      const contentType = 'image/webp';
      try {
        const result = await processImageForUpload(originalBuffer);
        processedBuffer = result.buffer;
      } catch {
        // Do NOT fall back to original — unprocessed images retain EXIF/GPS metadata
        return NextResponse.json(
          { error: `Could not process image "${file.name}". Please try a different file.` },
          { status: 422 }
        );
      }

      // Upload to Supabase Storage
      const { error } = await (supabase as TypedSupabase).storage
        .from(BUCKET_NAME)
        .upload(filePath, processedBuffer, {
          contentType,
          cacheControl: '31536000', // 1 year cache (immutable content)
          upsert: false,
        });

      if (error) {
        // Clean up already uploaded files using tracked storage paths
        if (uploadedPaths.length > 0) {
          await (supabase as TypedSupabase).storage.from(BUCKET_NAME).remove(uploadedPaths);
        }

        return NextResponse.json(
          { error: `Failed to upload ${file.name}`, details: error.message },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = (supabase as TypedSupabase).storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        return NextResponse.json(
          { error: `Failed to get public URL for ${file.name}` },
          { status: 500 }
        );
      }

      uploadedUrls.push(urlData.publicUrl);
      uploadedPaths.push(filePath);
    }

    return NextResponse.json({
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error) {
    return handleApiError(error, 'Upload photos');
  }
}
