import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { handleApiError, handleValidationError } from '@/lib/api/error-handler';
import { validateFeedbackRequest, getExtensionFromMimeType } from '@/lib/feedback';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import type { SubmitFeedbackRequest } from '@/lib/types/feedback';

/**
 * POST /api/feedback
 * Submit user feedback (feature request, bug report, or general feedback)
 * Accepts both authenticated and anonymous submissions
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (supports anonymous submissions)
    const ip = getClientIP(request.headers);
    const rateLimit = await checkRateLimit('feedback', ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error, reset: rateLimit.reset },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabase();

    // Get user if authenticated (optional for feedback)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse request body
    let body: SubmitFeedbackRequest;
    try {
      body = (await request.json()) as SubmitFeedbackRequest;
    } catch {
      return handleValidationError('Invalid request body', 'Submit feedback');
    }

    // Validate request (includes screenshot decoding if present)
    const validation = validateFeedbackRequest(body);
    if (!validation.valid) {
      return handleValidationError(validation.errors.join(', '), 'Submit feedback');
    }

    // Generate feedback ID for screenshot path
    const feedbackId = crypto.randomUUID();
    let screenshotUrl: string | null = null;

    // Handle screenshot upload using pre-validated data from validateFeedbackRequest
    if (validation.screenshotData) {
      const { mimeType, buffer } = validation.screenshotData;
      const extension = getExtensionFromMimeType(mimeType);
      const filePath = `${feedbackId}/screenshot.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('feedback-screenshots')
        .upload(filePath, buffer, {
          contentType: mimeType,
          cacheControl: '31536000', // 1 year
        });

      if (uploadError) {
        return handleApiError(uploadError, 'Upload screenshot', 500);
      }

      screenshotUrl = filePath;
    }

    // Insert feedback record with truncated context fields
    const { error: insertError } = await supabase.from('user_feedback').insert({
      id: feedbackId,
      type: body.type,
      description: body.description.trim(),
      email: body.email?.trim() || null,
      screenshot_url: screenshotUrl,
      page_url: body.context.pageUrl?.slice(0, 2000) || null,
      user_id: user?.id || null,
      user_agent: body.context.userAgent?.slice(0, 1000) || null,
      viewport_size: body.context.viewportSize?.slice(0, 20) || null,
      locale: body.context.locale?.slice(0, 10) || null,
    });

    if (insertError) {
      return handleApiError(insertError, 'Submit feedback', 500);
    }

    return NextResponse.json({
      success: true,
      id: feedbackId,
    });
  } catch (error) {
    return handleApiError(error, 'Submit feedback');
  }
}
