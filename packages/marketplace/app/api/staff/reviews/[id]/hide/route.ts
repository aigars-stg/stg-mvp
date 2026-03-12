import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/staff/reviews/[id]/hide
 *
 * Staff endpoint to hide a review.
 * Requires is_staff on user_profiles. Sets is_hidden = true on the review.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    const { id: reviewId } = await params;

    // Set is_hidden = true on the review
    const { error: updateError } = await serviceClient
      .from('seller_reviews')
      .update({ is_hidden: true })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Failed to hide review:', updateError);
      return NextResponse.json(
        { error: 'Failed to hide review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Hide review');
  }
}
