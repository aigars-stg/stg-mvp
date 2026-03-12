import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import type { FeedbackStatus, FeedbackType } from '@/lib/types/feedback';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/feedback
 *
 * Staff-only endpoint to list all user feedback submissions.
 * Supports filtering by status, type, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as FeedbackStatus | null;
    const type = searchParams.get('type') as FeedbackType | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Build query using serviceClient (staff already verified)
    let query = serviceClient
      .from('user_feedback')
      .select(
        `
        id,
        type,
        description,
        email,
        screenshot_url,
        page_url,
        user_id,
        user_agent,
        viewport_size,
        locale,
        status,
        internal_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: feedback, error: feedbackError, count } = await query;

    if (feedbackError) {
      return handleApiError(feedbackError, 'Fetch feedback list');
    }

    // Fetch user profiles for feedback with user_id
    const userIds = feedback
      ?.filter((f) => f.user_id)
      .map((f) => f.user_id) as string[];

    let userProfiles: Record<string, { full_name: string | null; email: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await serviceClient
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profiles) {
        userProfiles = profiles.reduce(
          (acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email };
            return acc;
          },
          {} as Record<string, { full_name: string | null; email: string | null }>
        );
      }
    }

    // Enrich feedback with user data
    const enrichedFeedback = feedback?.map((f) => ({
      ...f,
      user: f.user_id
        ? {
            id: f.user_id,
            full_name: userProfiles[f.user_id]?.full_name || null,
            email: userProfiles[f.user_id]?.email || null,
          }
        : null,
    }));

    return NextResponse.json({
      data: enrichedFeedback,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch feedback list');
  }
}
