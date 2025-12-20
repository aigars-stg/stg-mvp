import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { GameWithOffers, GameOffersResponse } from '@/lib/types/aggregated-game';
import type { ListingWithSeller } from '@/lib/types/listing';

/**
 * GET /api/games/[id]/offers
 *
 * Fetches all active offers (listings) for a specific game.
 * Returns game metadata plus all available offers sorted by price.
 *
 * Query params:
 * - sort: Sort order (price_asc, price_desc, condition, newest)
 * - condition: Filter by condition(s)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bggId = parseInt(params.id);
    if (isNaN(bggId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'price_asc';
    const conditions = searchParams.getAll('condition');

    console.log(`🎮 [Game Offers] Fetching offers for game ${bggId}`);

    // Create Supabase client
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

    // Fetch game metadata including versions for version-specific images
    const { data: gameData, error: gameError } = await (supabase as any)
      .from('games')
      .select('id, name, thumbnail, image, player_count, min_age, playing_time, is_expansion, yearpublished, versions')
      .eq('id', bggId)
      .single();

    if (gameError && gameError.code !== 'PGRST116') {
      console.error('❌ [Game Offers] Game fetch error:', gameError);
    }

    // Build query for listings (seller trust fetched separately - no FK exists)
    let query = (supabase as any)
      .from('listings')
      .select(`
        *
      `)
      .eq('bgg_game_id', bggId)
      .eq('status', 'active')
      // Show listings that are not reserved OR where reservation has expired
      .or(`reserved_by.is.null,reserved_until.lt.${new Date().toISOString()}`);

    // Apply condition filter
    if (conditions.length > 0) {
      query = query.in('condition', conditions);
    }

    // Apply sorting
    switch (sort) {
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'condition':
        // Sort by condition quality (likeNew > veryGood > good > acceptable)
        query = query.order('price', { ascending: true }); // Fallback to price
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_asc':
      default:
        query = query.order('price', { ascending: true });
        break;
    }

    const { data: listings, error: listingsError } = await query;

    if (listingsError) {
      console.error('❌ [Game Offers] Listings fetch error:', listingsError);
      return NextResponse.json(
        { error: 'Failed to fetch offers', details: listingsError.message },
        { status: 500 }
      );
    }

    // Fetch seller trust data AND profile data separately
    // We fetch public_seller_profiles (trust) and public_profiles (identity)
    let sellerTrustMap = new Map<string, any>();
    let sellerProfileMap = new Map<string, any>();

    if (listings && listings.length > 0) {
      const sellerIds = [...new Set(listings.map((l: any) => l.seller_id))];

      // 1. Fetch Trust Stats
      const { data: sellerTrust } = await (supabase as any)
        .from('public_seller_profiles')
        .select('*')
        .in('user_id', sellerIds);

      if (sellerTrust) {
        sellerTrustMap = new Map(sellerTrust.map((p: any) => [p.user_id, p]));
      }

      // 2. Fetch Identity (Name, Avatar, Country)
      const { data: sellerIdentity } = await (supabase as any)
        .from('public_profiles')
        .select('id, full_name, avatar_url, country')
        .in('id', sellerIds);

      if (sellerIdentity) {
        sellerProfileMap = new Map(sellerIdentity.map((p: any) => [p.id, p]));
      }
    }

    // If no game data from games table, use data from first listing
    const firstListing = listings?.[0];
    const gameName = gameData?.name || firstListing?.game_name || 'Unknown Game';
    const gameYear = gameData?.yearpublished || firstListing?.game_year || null;

    // Add game metadata to each listing with version-specific images
    const offersWithGame: ListingWithSeller[] = (listings || []).map((listing: any) => {
      // Look up version-specific images if bgg_version_id exists
      let versionThumbnail = null;
      let versionImage = null;

      if (listing.bgg_version_id && gameData?.versions) {
        const version = gameData.versions.find((v: any) => v.id === listing.bgg_version_id);
        if (version) {
          versionThumbnail = version.thumbnail;
          versionImage = version.image;
        }
      }

      // Get seller trust data from the separate query
      const sellerTrust = sellerTrustMap.get(listing.seller_id);
      const sellerIdentity = sellerProfileMap.get(listing.seller_id);

      return {
        ...listing,
        seller: {
          id: listing.seller_id,
          full_name: sellerIdentity?.full_name || 'Unknown Seller',
          email: '', // REMOVED EMAIL FOR SECURITY
          avatar_url: sellerIdentity?.avatar_url || null,
          country: sellerIdentity?.country || null,

          // Add trust fields from public_seller_profiles
          total_reviews: sellerTrust?.total_reviews ?? 0,
          average_rating: sellerTrust?.average_rating ?? 0,
          total_completed_sales: sellerTrust?.total_completed_sales ?? 0,
          member_since: sellerTrust?.member_since ?? null,
        },
        game: {
          // Use version-specific image if available, otherwise fall back to base game image
          thumbnail: versionThumbnail || gameData?.thumbnail || null,
          image: versionImage || gameData?.image || null,
          player_count: gameData?.player_count || null,
          min_age: gameData?.min_age || null,
          playing_time: gameData?.playing_time || null,
          is_expansion: gameData?.is_expansion || false,
        },
      };
    });

    // Sort by condition if requested (manual sort since DB can't do custom order)
    if (sort === 'condition') {
      const conditionOrder: Record<string, number> = {
        likeNew: 0,
        veryGood: 1,
        good: 2,
        acceptable: 3,
      };
      offersWithGame.sort((a, b) => {
        const orderA = conditionOrder[a.condition] ?? 4;
        const orderB = conditionOrder[b.condition] ?? 4;
        if (orderA !== orderB) return orderA - orderB;
        return a.price - b.price; // Secondary sort by price
      });
    }

    // Calculate aggregates
    const prices = offersWithGame.map(o => o.price);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const gameWithOffers: GameWithOffers = {
      bgg_game_id: bggId,
      game_name: gameName,
      game_year: gameYear,
      image: gameData?.image || null,
      thumbnail: gameData?.thumbnail || null,
      player_count: gameData?.player_count || null,
      min_age: gameData?.min_age || null,
      playing_time: gameData?.playing_time || null,
      is_expansion: gameData?.is_expansion || false,
      offers: offersWithGame,
      offer_count: offersWithGame.length,
      lowest_price: lowestPrice,
      highest_price: highestPrice,
    };

    console.log(`✅ [Game Offers] Returning ${offersWithGame.length} offers for "${gameName}"`);

    const response: GameOffersResponse = {
      game: gameWithOffers,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('❌ [Game Offers] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game offers', details: error.message },
      { status: 500 }
    );
  }
}
