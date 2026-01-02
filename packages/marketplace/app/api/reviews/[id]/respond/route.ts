import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/reviews/[id]/respond
 *
 * Seller responds to a review
 * Body:
 * - response: required - seller's response text (max 500 chars)
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
    const { response } = body;

    // Validate response
    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        { error: 'response is required' },
        { status: 400 }
      );
    }

    const trimmedResponse = response.trim();

    if (trimmedResponse.length === 0) {
      return NextResponse.json(
        { error: 'response cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedResponse.length > 500) {
      return NextResponse.json(
        { error: 'response must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Get the review to verify ownership
    const { data: review, error: reviewError } = await supabase
      .from('seller_reviews')
      .select('id, seller_id, seller_response')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Verify the user is the seller
    if (review.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only respond to reviews about your own sales' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (review.seller_response) {
      return NextResponse.json(
        { error: 'You have already responded to this review' },
        { status: 400 }
      );
    }

    // Update the review with seller response
    const { data: updatedReview, error: updateError } = await supabase
      .from('seller_reviews')
      .update({
        seller_response: trimmedResponse,
        seller_responded_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save response', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (error) {
    return handleApiError(error, 'Submit review response');
  }
}
