import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/collections
 *
 * Returns algorithm-driven game collections for the homepage
 * Query params:
 * - type: Collection type (recently_listed, popular, price_drops, trusted_sellers)
 * - limit: Number of items (default: 8)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recently_listed';
    const limit = parseInt(searchParams.get('limit') || '8');

    const supabase = await createServerSupabase();

    let listings: any[] = [];
    let title = '';
    let subtitle = '';

    switch (type) {
      case 'recently_listed':
        title = 'Just Listed';
        subtitle = 'Fresh arrivals from Baltic gamers';
        ({ listings } = await getRecentlyListed(supabase, limit));
        break;

      case 'popular':
        title = 'Popular Right Now';
        subtitle = 'Games everyone is looking at';
        ({ listings } = await getPopularGames(supabase, limit));
        break;

      case 'price_drops':
        title = 'Price Drops';
        subtitle = 'Recently reduced prices';
        ({ listings } = await getPriceDrops(supabase, limit));
        break;

      case 'trusted_sellers':
        title = 'From Trusted Sellers';
        subtitle = 'Top-rated seller picks';
        ({ listings } = await getTrustedSellerListings(supabase, limit));
        break;

      case 'great_condition':
        title = 'Like New Games';
        subtitle = 'Pristine condition finds';
        ({ listings } = await getGreatCondition(supabase, limit));
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid collection type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      collection: {
        type,
        title,
        subtitle,
        listings,
        count: listings.length,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Recently listed - newest first
async function getRecentlyListed(supabase: any, limit: number) {
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { listings: [] };
  }

  // Fetch game and seller trust data separately
  const enrichedListings = await enrichListingsWithGames(supabase, listings || []);
  const withTrust = await enrichListingsWithSellerTrust(supabase, enrichedListings);
  return { listings: transformListings(withTrust) };
}

// Popular games - games with multiple listings or high BGG ratings
async function getPopularGames(supabase: any, limit: number) {
  // Get games with most active listings
  const { data: popularGameIds } = await supabase
    .from('listings')
    .select('bgg_game_id')
    .eq('status', 'active');

  // Count listings per game
  const gameCounts = new Map<number, number>();
  popularGameIds?.forEach((l: { bgg_game_id: number }) => {
    gameCounts.set(l.bgg_game_id, (gameCounts.get(l.bgg_game_id) || 0) + 1);
  });

  // Sort by count and get top games
  const topGameIds = Array.from(gameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2)
    .map(([id]) => id);

  if (topGameIds.length === 0) {
    return { listings: [] };
  }

  // Get one listing per popular game (cheapest)
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:user_profiles!seller_id (
        id,
        full_name,
        avatar_url,
        country
      )
    `)
    .eq('status', 'active')
    .in('bgg_game_id', topGameIds)
    .order('price', { ascending: true })
    .limit(limit * 3);

  if (error) {
    return { listings: [] };
  }

  // Dedupe by game - keep lowest price per game
  const seenGames = new Set<number>();
  const uniqueListings = (listings || []).filter((l: any) => {
    if (seenGames.has(l.bgg_game_id)) return false;
    seenGames.add(l.bgg_game_id);
    return true;
  }).slice(0, limit);

  const enrichedListings = await enrichListingsWithGames(supabase, uniqueListings);
  const withTrust = await enrichListingsWithSellerTrust(supabase, enrichedListings);
  return { listings: transformListings(withTrust) };
}

// Price drops - listings with previous_price > current price
async function getPriceDrops(supabase: any, limit: number) {
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:user_profiles!seller_id (
        id,
        full_name,
        avatar_url,
        country
      )
    `)
    .eq('status', 'active')
    .not('previous_price', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit * 2);

  if (error) {
    return { listings: [] };
  }

  // Filter to only actual price drops and sort by discount %
  const priceDrops = (listings || [])
    .filter((l: any) => l.previous_price && l.previous_price > l.price)
    .sort((a: any, b: any) => {
      const discountA = (a.previous_price - a.price) / a.previous_price;
      const discountB = (b.previous_price - b.price) / b.previous_price;
      return discountB - discountA;
    })
    .slice(0, limit);

  const enrichedListings = await enrichListingsWithGames(supabase, priceDrops);
  const withTrust = await enrichListingsWithSellerTrust(supabase, enrichedListings);
  return { listings: transformListings(withTrust) };
}

// Listings from trusted sellers (high ratings)
async function getTrustedSellerListings(supabase: any, limit: number) {
  // Get sellers with good ratings
  const { data: trustedSellers } = await supabase
    .from('seller_profiles')
    .select('user_id')
    .gte('average_rating', 4.5)
    .gte('total_completed_sales', 3)
    .order('average_rating', { ascending: false })
    .limit(20);

  if (!trustedSellers || trustedSellers.length === 0) {
    // Fallback to any sellers with completed sales
    const { data: anySellers } = await supabase
      .from('seller_profiles')
      .select('user_id')
      .gte('total_completed_sales', 1)
      .order('total_completed_sales', { ascending: false })
      .limit(20);

    if (!anySellers || anySellers.length === 0) {
      return { listings: [] };
    }

    const sellerIds = anySellers.map((s: { user_id: string }) => s.user_id);

    const { data: listings } = await supabase
      .from('listings')
      .select(`
        *
      `)
      .eq('status', 'active')
      .in('seller_id', sellerIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    const enrichedListings = await enrichListingsWithGames(supabase, listings || []);
    const withTrust = await enrichListingsWithSellerTrust(supabase, enrichedListings);
    return { listings: transformListings(withTrust) };
  }

  const sellerIds = trustedSellers.map((s: { user_id: string }) => s.user_id);

  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *
    `)
    .eq('status', 'active')
    .in('seller_id', sellerIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { listings: [] };
  }

  const enrichedListings = await enrichListingsWithGames(supabase, listings || []);
  const withTrust = await enrichListingsWithSellerTrust(supabase, enrichedListings);
  return { listings: transformListings(withTrust) };
}

// Great condition listings (likeNew)
async function getGreatCondition(supabase: any, limit: number) {
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *
    `)
    .eq('status', 'active')
    .eq('condition', 'likeNew')
    .eq('all_components_present', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { listings: [] };
  }

  const enrichedListings = await enrichListingsWithGames(supabase, listings || []);
  const withTrust = await enrichListingsWithSellerTrust(supabase, enrichedListings);
  return { listings: transformListings(withTrust) };
}

// Fetch game data separately and merge into listings
async function enrichListingsWithGames(supabase: any, listings: any[]) {
  if (!listings || listings.length === 0) return [];

  const gameIds = [...new Set(listings.map((l: any) => l.bgg_game_id))];
  const { data: games } = await supabase
    .from('games')
    .select('id, thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
    .in('id', gameIds);

  if (games) {
    const gamesMap = new Map(games.map((g: any) => [g.id, g]));
    listings.forEach((listing: any) => {
      const game: any = gamesMap.get(listing.bgg_game_id);
      if (game) {
        // Check if listing has a version-specific image
        let versionThumbnail = null;
        let versionImage = null;

        if (listing.bgg_version_id && game.versions) {
          const version = game.versions.find((v: any) => v.id === listing.bgg_version_id);
          if (version) {
            versionThumbnail = version.thumbnail;
            versionImage = version.image;
          }
        }

        listing.game = {
          thumbnail: versionThumbnail || game.thumbnail,
          image: versionImage || game.image,
          player_count: game.player_count,
          min_age: game.min_age,
          playing_time: game.playing_time,
          is_expansion: game.is_expansion,
        };
      } else {
        listing.game = {
          thumbnail: null,
          image: null,
          player_count: null,
          min_age: null,
          playing_time: null,
          is_expansion: null,
        };
      }
    });
  }

  return listings;
}

// Fetch seller trust data AND profile data separately
async function enrichListingsWithSellerTrust(supabase: any, listings: any[]) {
  if (!listings || listings.length === 0) return listings;

  const sellerIds = [...new Set(listings.map((l: any) => l.seller_id))];

  // 1. Fetch Trust Stats
  const { data: sellerProfiles } = await supabase
    .from('public_seller_profiles')
    .select('user_id, total_reviews, average_rating, total_completed_sales')
    .in('user_id', sellerIds);

  // 2. Fetch Identity
  const { data: sellerIdentity } = await supabase
    .from('public_profiles')
    .select('id, full_name, avatar_url, country')
    .in('id', sellerIds);

  const trustMap = sellerProfiles
    ? new Map(sellerProfiles.map((p: any) => [p.user_id, p]))
    : new Map();

  const identityMap = sellerIdentity
    ? new Map(sellerIdentity.map((p: any) => [p.id, p]))
    : new Map();

  listings.forEach((listing: any) => {
    listing.seller_trust = trustMap.get(listing.seller_id) || null;
    listing.seller_identity = identityMap.get(listing.seller_id) || null;
  });

  return listings;
}

// Transform listings to merge seller trust data
function transformListings(listings: any[]) {
  return listings.map((listing) => {
    const { seller_trust, seller_identity, ...rest } = listing;
    return {
      ...rest,
      seller: {
        id: listing.seller_id,
        // Identity
        full_name: seller_identity?.full_name || 'Unknown Seller',
        avatar_url: seller_identity?.avatar_url || null,
        country: seller_identity?.country || null,
        email: '', // Ensure no email

        // Trust
        total_reviews: seller_trust?.total_reviews ?? 0,
        average_rating: seller_trust?.average_rating ?? 0,
        total_completed_sales: seller_trust?.total_completed_sales ?? 0,
      },
    };
  });
}
