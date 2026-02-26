import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { handleApiError, handleValidationError } from '@/lib/api/error-handler';
import {
  validateFeedbackRequest,
  validateScreenshot,
  getExtensionFromMimeType,
} from '@/lib/feedback';
import type { SubmitFeedbackRequest } from '@/lib/types/feedback';

/**
 * POST /api/feedback
 * Submit user feedback (feature request, bug report, or general feedback)
 * Accepts both authenticated and anonymous submissions
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate request
    const validation = validateFeedbackRequest(body);
    if (!validation.valid) {
      return handleValidationError(validation.errors.join(', '), 'Submit feedback');
    }

    // Generate feedback ID for screenshot path
    const feedbackId = crypto.randomUUID();
    let screenshotUrl: string | null = null;

    // Handle screenshot upload if provided
    if (body.screenshotBase64) {
      const screenshotValidation = validateScreenshot(body.screenshotBase64);
      if (!screenshotValidation.valid) {
        return handleValidationError(
          screenshotValidation.error || 'Invalid screenshot',
          'Submit feedback'
        );
      }

      const { mimeType, buffer } = screenshotValidation;
      const extension = getExtensionFromMimeType(mimeType!);
      const filePath = `${feedbackId}/screenshot.${extension}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('feedback-screenshots')
        .upload(filePath, buffer!, {
          contentType: mimeType,
          cacheControl: '31536000', // 1 year
        });

      if (uploadError) {
        return handleApiError(uploadError, 'Upload screenshot', 500);
      }

      // Store the path (staff will use signed URLs to access)
      screenshotUrl = filePath;
    }

    // Insert feedback record
    const { error: insertError } = await supabase.from('user_feedback').insert({
      id: feedbackId,
      type: body.type,
      description: body.description.trim(),
      email: body.email?.trim() || null,
      screenshot_url: screenshotUrl,
      page_url: body.context.pageUrl,
      user_id: user?.id || null,
      user_agent: body.context.userAgent,
      viewport_size: body.context.viewportSize,
      locale: body.context.locale,
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
