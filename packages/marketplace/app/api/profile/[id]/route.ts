import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { SellerBadgeTier } from '@/lib/types/seller';
import { handleApiError } from '@/lib/api/error-handler';
import type { ListingRow } from '@/lib/supabase/query-types';

export const dynamic = 'force-dynamic';

// Types for the API response
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

interface ListingWithSellerAndGame extends ListingRow {
  game: {
    thumbnail: string | null;
    image: string | null;
    player_count: string | null;
    min_age: number | null;
    playing_time: string | null;
    is_expansion: boolean;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    country: string | null;
    total_reviews: number;
    average_rating: number;
    total_completed_sales: number;
    member_since: string | null;
  };
}

interface GameVersion {
  id: number;
  thumbnail?: string;
  image?: string;
}

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
 * - listings_page: number - page for listings pagination (default: 1)
 * - listings_limit: number - listings per page (default: 12)
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
    const listingsPage = parseInt(searchParams.get('listings_page') || '1');
    const listingsLimit = parseInt(searchParams.get('listings_limit') || '12');

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
        member_since,
        is_founding_seller
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
        is_founding_seller: boolean;
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
      listings?: {
        data: ListingWithSellerAndGame[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
        };
      };
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
        is_founding_seller: false,
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
        is_founding_seller: trustData.is_founding_seller ?? false,
      };

      // Fetch active listings preview (we already have the count from earlier)
      response.seller.active_listings_count = activeListingsCount ?? 0;

      if (includeListings && hasActiveListings) {
        // Fetch full listing data for OfferCard display with pagination
        const listingsFrom = (listingsPage - 1) * listingsLimit;
        const listingsTo = listingsFrom + listingsLimit - 1;

        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('*')
          .eq('seller_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .range(listingsFrom, listingsTo);

        if (listingsError) {
          // Continue without listings
        }

        // Fetch game metadata for listings
        if (listings && listings.length > 0) {
          const gameIds = [...new Set(listings.map((l) => l.bgg_game_id).filter(Boolean))];

          let gamesMap = new Map();
          if (gameIds.length > 0) {
            const { data: games } = await supabase
              .from('games')
              .select('id, thumbnail, image, versions, player_count, min_age, playing_time, is_expansion')
              .in('id', gameIds);

            gamesMap = new Map(games?.map((g) => [g.id, g]) || []);
          }

          // Build seller data object (same for all listings since this is the seller's profile)
          const sellerData = {
            id: userId,
            full_name: userProfile.full_name ?? 'Anonymous',
            email: '', // Not exposed in public profile
            avatar_url: userProfile.avatar_url,
            country: userProfile.country,
            total_reviews: trustData.total_reviews ?? 0,
            average_rating: trustData.average_rating ?? 0,
            total_completed_sales: trustData.total_completed_sales ?? 0,
            member_since: trustData.member_since || userProfile.created_at,
          };

          // Transform listings to ListingWithSeller format
          const listingsWithSeller = listings.map((listing) => {
            const game = gamesMap.get(listing.bgg_game_id);
            let thumbnail = game?.thumbnail || null;
            let image = game?.image || null;

            // Check for version-specific images
            if (listing.bgg_version_id && game?.versions && Array.isArray(game.versions)) {
              const version = (game.versions as GameVersion[]).find((v) => v.id === listing.bgg_version_id);
              if (version?.thumbnail) thumbnail = version.thumbnail;
              if (version?.image) image = version.image;
            }

            return {
              ...listing,
              game: {
                thumbnail,
                image,
                player_count: game?.player_count || null,
                min_age: game?.min_age || null,
                playing_time: game?.playing_time || null,
                is_expansion: game?.is_expansion || false,
              },
              seller: sellerData,
            };
          });

          const listingsTotal = activeListingsCount ?? 0;
          response.listings = {
            data: listingsWithSeller,
            pagination: {
              page: listingsPage,
              limit: listingsLimit,
              total: listingsTotal,
              hasMore: listingsFrom + listingsWithSeller.length < listingsTotal,
            },
          };
        } else {
          response.listings = {
            data: [],
            pagination: {
              page: listingsPage,
              limit: listingsLimit,
              total: 0,
              hasMore: false,
            },
          };
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
          const transformedReviews = reviews.map((review) => {
            const buyer = buyersMap.get(review.buyer_id);
            // Handle the order field which may be an array or object due to Supabase join
            const orderData = Array.isArray(review.order) ? review.order[0] : review.order;
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
              order_number: orderData?.order_number || null,
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
  } catch (error) {
    return handleApiError(error, 'Fetch profile');
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
