import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to respond to a review' },
        { status: 401 }
      );
    }

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
      console.error('❌ [Reviews] Error updating review response:', updateError);
      return NextResponse.json(
        { error: 'Failed to save response', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Reviews] Seller responded to review:', reviewId);

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (error: unknown) {
    console.error('❌ [Reviews] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to submit response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
