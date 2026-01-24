import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { SellerBadgeTier } from '@/lib/types/seller';

// Type for transformed review data returned in the API response
interface TransformedReview {
  id: string;
  rating: number;
  review_text: string | null;
  seller_response: string | null;
  seller_responded_at: string | null;
  created_at: string | null;
  buyer_name: string;
  buyer_avatar: string | null;
  buyer_country: string | null;
  order_number: string | null;
}

/**
 * GET /api/sellers/[id]
 *
 * Get public seller profile with trust data and reviews
 * Query params:
 * - include_reviews: boolean - include paginated reviews (default: true)
 * - include_listings: boolean - include active listings count (default: true)
 * - reviews_page: number - page for reviews pagination (default: 1)
 * - reviews_limit: number - reviews per page (default: 10)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = params.id;
    const { searchParams } = new URL(request.url);
    const includeReviews = searchParams.get('include_reviews') !== 'false';
    const includeListings = searchParams.get('include_listings') !== 'false';
    const reviewsPage = parseInt(searchParams.get('reviews_page') || '1');
    const reviewsLimit = parseInt(searchParams.get('reviews_limit') || '10');

    const supabase = await createServerSupabase();

    // Fetch basic user profile (from secure view)
    const { data: userProfile, error: userError } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url, country, created_at')
      .eq('id', sellerId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // Fetch seller profile with trust data (from secure view)
    const { data: sellerProfile } = await supabase
      .from('public_seller_profiles')
      .select(`
        seller_status,
        total_reviews,
        average_rating,
        positive_rating_percent,
        total_completed_sales,
        member_since
      `)
      .eq('user_id', sellerId)
      .single();

    // Seller profile might not exist if they haven't sold anything yet
    const trustData = sellerProfile || {
      seller_status: 'not_started',
      total_reviews: 0,
      average_rating: 0,
      positive_rating_percent: 100,
      total_completed_sales: 0,
      member_since: userProfile.created_at,
    };

    // Calculate badge tier
    const badgeTier = getBadgeTier(
      trustData.total_completed_sales ?? 0,
      trustData.average_rating ?? 0
    );

    // Build response
    const response: {
      seller: {
        id: string;
        name: string;
        avatar_url: string | null;
        country: string | null;
        member_since: string;
        total_reviews: number;
        average_rating: number;
        positive_rating_percent: number;
        total_completed_sales: number;
        badge_tier: SellerBadgeTier;
        active_listings_count?: number;
      };
      reviews?: {
        data: TransformedReview[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
        };
      };
    } = {
      seller: {
        id: sellerId,
        name: userProfile.full_name ?? 'Anonymous',
        avatar_url: userProfile.avatar_url,
        country: userProfile.country,
        member_since: trustData.member_since || userProfile.created_at || new Date().toISOString(),
        total_reviews: trustData.total_reviews ?? 0,
        average_rating: trustData.average_rating ?? 0,
        positive_rating_percent: trustData.positive_rating_percent ?? 100,
        total_completed_sales: trustData.total_completed_sales ?? 0,
        badge_tier: badgeTier,
      },
    };

    // Fetch active listings count
    if (includeListings) {
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('status', 'active');

      response.seller.active_listings_count = count || 0;
    }

    // Fetch reviews with buyer info
    if (includeReviews) {
      const from = (reviewsPage - 1) * reviewsLimit;
      const to = from + reviewsLimit - 1;

      const { data: reviews, count, error: reviewsError } = await supabase
        .from('seller_reviews')
        .select(`
          id,
          rating,
          review_text,
          seller_response,
          seller_responded_at,
          created_at,
          buyer_id,
          order:orders!order_id (
            order_number
          )
        `, { count: 'exact' })
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (reviewsError) {
        // Continue without reviews rather than failing
      } else {
        // Fetch buyer profiles separately
        const buyerIds = [...new Set((reviews || []).map(r => r.buyer_id))];
        const { data: buyers } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, country')
          .in('id', buyerIds);

        const buyersMap = new Map(buyers?.map(b => [b.id, b]) || []);

        // Type for the raw review data from the database query
        type ReviewQueryResult = {
          id: string;
          rating: number;
          review_text: string | null;
          seller_response: string | null;
          seller_responded_at: string | null;
          created_at: string | null;
          buyer_id: string;
          order: { order_number: string } | null;
        };

        // Transform reviews to flatten buyer info
        const transformedReviews: TransformedReview[] = (reviews || []).map((review: ReviewQueryResult) => {
          const buyer = buyersMap.get(review.buyer_id);
          return {
            id: review.id,
            rating: review.rating,
            review_text: review.review_text,
            seller_response: review.seller_response,
            seller_responded_at: review.seller_responded_at,
            created_at: review.created_at,
            buyer_name: buyer?.full_name || 'Anonymous',
            buyer_avatar: buyer?.avatar_url || null,
            buyer_country: buyer?.country || null,
            order_number: review.order?.order_number || null,
          };
        });

        const total = count || 0;
        response.reviews = {
          data: transformedReviews,
          pagination: {
            page: reviewsPage,
            limit: reviewsLimit,
            total,
            hasMore: from + transformedReviews.length < total,
          },
        };
      }
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch seller profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getBadgeTier(totalSales: number, averageRating: number): SellerBadgeTier {
  if (totalSales >= 25 && averageRating >= 4.8) {
    return 'top_seller';
  }
  if (totalSales >= 5 && averageRating >= 4.5) {
    return 'trusted_seller';
  }
  return 'new_seller';
}
