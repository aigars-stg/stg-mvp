import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/reviews/[id]/report
 *
 * Report a review as inappropriate.
 * Body:
 * - reason: required - why the review is being reported (max 500 chars)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response: authResponse, user, supabase } = await requireAuth();
    if (authResponse) return authResponse;

    const reviewId = params.id;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'reason must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('seller_reviews')
      .select('id, reported_at')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if already reported
    if (review.reported_at) {
      return NextResponse.json(
        { error: 'This review has already been reported' },
        { status: 400 }
      );
    }

    // Update the review with report info
    const { error: updateError } = await supabase
      .from('seller_reviews')
      .update({
        reported_by: user.id,
        report_reason: reason.trim(),
        reported_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to report review', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Report review');
  }
}
