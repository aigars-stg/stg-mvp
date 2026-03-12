import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import {
  handleApiError,
  handleNotFoundError,
  handleValidationError,
} from '@/lib/api/error-handler';
import type { FeedbackStatus, UpdateFeedbackRequest } from '@/lib/types/feedback';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: FeedbackStatus[] = [
  'new',
  'reviewed',
  'in_progress',
  'resolved',
  'closed',
];

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/staff/feedback/[id]
 *
 * Staff-only endpoint to get a single feedback submission with full details.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    // Fetch feedback
    const { data: feedback, error: feedbackError } = await serviceClient
      .from('user_feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (feedbackError || !feedback) {
      return handleNotFoundError('Feedback');
    }

    // Fetch user profile if user_id exists
    let userProfile = null;
    if (feedback.user_id) {
      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('id', feedback.user_id)
        .maybeSingle();
      userProfile = profile;
    }

    // Fetch reviewer profile if reviewed_by exists
    let reviewerProfile = null;
    if (feedback.reviewed_by) {
      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', feedback.reviewed_by)
        .maybeSingle();
      reviewerProfile = profile;
    }

    // Generate signed URL for screenshot if exists
    let screenshotSignedUrl = null;
    if (feedback.screenshot_url) {
      const { data: signedUrlData } = await serviceClient.storage
        .from('feedback-screenshots')
        .createSignedUrl(feedback.screenshot_url, 3600); // 1 hour expiry
      screenshotSignedUrl = signedUrlData?.signedUrl || null;
    }

    return NextResponse.json({
      ...feedback,
      screenshot_signed_url: screenshotSignedUrl,
      user: userProfile
        ? {
            id: userProfile.id,
            full_name: userProfile.full_name,
            email: userProfile.email,
          }
        : null,
      reviewer: reviewerProfile
        ? {
            id: reviewerProfile.id,
            full_name: reviewerProfile.full_name,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, 'Get feedback detail');
  }
}

/**
 * PATCH /api/staff/feedback/[id]
 *
 * Staff-only endpoint to update feedback status and internal notes.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { response, user, serviceClient } = await requireStaffAuth();
    if (response) return response;

    // Parse request body
    const body = (await request.json()) as UpdateFeedbackRequest;

    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return handleValidationError(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        'Update feedback'
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      // Track who reviewed and when
      updateData.reviewed_by = user.id;
      updateData.reviewed_at = new Date().toISOString();
    }

    if (body.internal_notes !== undefined) {
      updateData.internal_notes = body.internal_notes;
    }

    if (Object.keys(updateData).length === 0) {
      return handleValidationError('No valid fields to update', 'Update feedback');
    }

    // Update feedback
    const { error: updateError } = await serviceClient
      .from('user_feedback')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      return handleApiError(updateError, 'Update feedback');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Update feedback');
  }
}
