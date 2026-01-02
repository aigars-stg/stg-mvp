import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/reviews
 *
 * Get reviews for a seller
 * Query params:
 * - seller_id: required - UUID of the seller
 * - limit: optional - number of reviews to return (default 10)
 * - offset: optional - offset for pagination (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('seller_id');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!sellerId) {
      return NextResponse.json(
        { error: 'seller_id is required' },
        { status: 400 }
      );
    }

    // Fetch reviews using the view that includes buyer info
    const { data: reviews, error: reviewsError, count } = await supabase
      .from('seller_reviews_with_buyer')
      .select('*', { count: 'exact' })
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) {
      return NextResponse.json(
        { error: 'Failed to fetch reviews', details: reviewsError.message },
        { status: 500 }
      );
    }

    // Get seller trust summary
    const { data: trustSummary, error: trustError } = await supabase
      .rpc('get_seller_trust_summary', { p_seller_id: sellerId });

    if (trustError) {
      // Non-blocking error - continue without trust summary
    }

    return NextResponse.json({
      reviews: reviews || [],
      total: count || 0,
      trust_summary: trustSummary || null,
    });
  } catch (error) {
    return handleApiError(error, 'Fetch reviews');
  }
}

/**
 * POST /api/reviews
 *
 * Submit a review for an order
 * Body:
 * - order_id: required - UUID of the order
 * - rating: required - 1-5 star rating
 * - review_text: optional - text review (max 500 chars)
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const { order_id, rating, review_text } = body;

    // Validate required fields
    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate review text length
    if (review_text && review_text.length > 500) {
      return NextResponse.json(
        { error: 'review_text must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Check if buyer can review this order
    const { data: canReviewData, error: canReviewError } = await supabase
      .rpc('can_buyer_review_order', {
        p_order_id: order_id,
        p_buyer_id: user.id,
      });

    if (canReviewError) {
      return NextResponse.json(
        { error: 'Failed to check review eligibility', details: canReviewError.message },
        { status: 500 }
      );
    }

    const canReview = canReviewData as { can_review: boolean; reason?: string } | null;
    if (!canReview?.can_review) {
      return NextResponse.json(
        { error: canReview?.reason || 'Cannot review this order' },
        { status: 400 }
      );
    }

    // Get the order to find seller_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('seller_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('seller_reviews')
      .insert({
        order_id,
        buyer_id: user.id,
        seller_id: order.seller_id,
        rating,
        review_text: review_text?.trim() || null,
      })
      .select()
      .single();

    if (reviewError) {
      // Check for unique constraint violation
      if (reviewError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already reviewed this order' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create review', details: reviewError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    return handleApiError(error, 'Submit review');
  }
}
