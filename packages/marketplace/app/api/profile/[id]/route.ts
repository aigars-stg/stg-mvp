import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { SellerBadgeTier } from '@/lib/types/seller';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/[id]
 *
 * Get unified public profile for any user.
 * - For all users: basic profile (name, avatar, country, member_since)
 * - For sellers: adds trust metrics, reviews, and listing previews
 *
 * Query params:
 * - include_reviews: boolean - include paginated reviews for sellers (default: true)
 * - include_listings: boolean - include listing previews for sellers (default: true)
 * - reviews_page: number - page for reviews pagination (default: 1)
 * - reviews_limit: number - reviews per page (default: 10)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
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
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch seller profile with trust data (from secure view)
    // Note: public_seller_profiles only includes seller_status='active'
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
      .eq('user_id', userId)
      .single();

    // Also check if user has active listings (they're a de facto seller even if onboarding)
    const { count: activeListingsCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'active');

    // User is a seller if they have active seller status OR have active listings
    const hasActiveListings = (activeListingsCount ?? 0) > 0;
    const isSeller = sellerProfile?.seller_status === 'active' || hasActiveListings;

    // Build base response
    const response: {
      user: {
        id: string;
        name: string;
        avatar_url: string | null;
        country: string | null;
        member_since: string;
      };
      seller?: {
        total_reviews: number;
        average_rating: number;
        positive_rating_percent: number;
        total_completed_sales: number;
        badge_tier: SellerBadgeTier;
        active_listings_count?: number;
      };
      reviews?: {
        data: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
        };
      };
      listings?: any[];
    } = {
      user: {
        id: userId,
        name: userProfile.full_name ?? 'Anonymous',
        avatar_url: userProfile.avatar_url,
        country: userProfile.country,
        member_since: sellerProfile?.member_since || userProfile.created_at || new Date().toISOString(),
      },
    };

    // Add seller data if user is a seller (has active status or active listings)
    if (isSeller) {
      // Use seller profile data if available, otherwise use defaults
      const trustData = sellerProfile || {
        total_reviews: 0,
        average_rating: 0,
        positive_rating_percent: 100,
        total_completed_sales: 0,
        member_since: userProfile.created_at,
      };

      const badgeTier = getBadgeTier(
        trustData.total_completed_sales ?? 0,
        trustData.average_rating ?? 0
      );

      response.seller = {
        total_reviews: trustData.total_reviews ?? 0,
        average_rating: trustData.average_rating ?? 0,
        positive_rating_percent: trustData.positive_rating_percent ?? 100,
        total_completed_sales: trustData.total_completed_sales ?? 0,
        badge_tier: badgeTier,
      };

      // Fetch active listings preview (we already have the count from earlier)
      response.seller.active_listings_count = activeListingsCount ?? 0;

      if (includeListings && hasActiveListings) {
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select(`
            id,
            game_name,
            price,
            condition,
            bgg_game_id,
            bgg_version_id,
            status
          `)
          .eq('seller_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);

        if (listingsError) {
          // Continue without listings
        }

        // Fetch game metadata for listing previews
        if (listings && listings.length > 0) {
          const gameIds = [...new Set(listings.map((l: any) => l.bgg_game_id).filter(Boolean))];

          if (gameIds.length > 0) {
            const { data: games } = await supabase
              .from('games')
              .select('id, thumbnail, image, versions')
              .in('id', gameIds);

            // Attach game data to listings
            const listingsWithGames = listings.map((listing: any) => {
              const game = games?.find((g: any) => g.id === listing.bgg_game_id);
              let thumbnail = game?.thumbnail || null;

              // Check for version-specific thumbnail
              if (listing.bgg_version_id && game?.versions && Array.isArray(game.versions)) {
                const version = game.versions.find((v: any) => v.id === listing.bgg_version_id) as { thumbnail?: string } | undefined;
                if (version?.thumbnail) {
                  thumbnail = version.thumbnail;
                }
              }

              return {
                id: listing.id,
                title: listing.game_name,
                price: listing.price,
                condition: listing.condition,
                thumbnail,
              };
            });

            response.listings = listingsWithGames;
          } else {
            response.listings = listings.map((l: any) => ({
              id: l.id,
              title: l.game_name,
              price: l.price,
              condition: l.condition,
              thumbnail: null,
            }));
          }
        } else {
          response.listings = [];
        }
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
          .eq('seller_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (!reviewsError && reviews) {
          // Fetch buyer profiles separately
          const buyerIds = [...new Set(reviews.map(r => r.buyer_id))];
          const { data: buyers } = await supabase
            .from('public_profiles')
            .select('id, full_name, avatar_url, country')
            .in('id', buyerIds);

          const buyersMap = new Map(buyers?.map(b => [b.id, b]) || []);

          // Transform reviews to flatten buyer info
          const transformedReviews = reviews.map((review: any) => {
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
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : 'Unknown error' },
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
