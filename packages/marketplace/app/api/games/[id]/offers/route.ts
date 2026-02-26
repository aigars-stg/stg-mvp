import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { GameWithOffers, GameOffersResponse } from '@/lib/types/aggregated-game';
import type { ListingWithSeller } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { fetchGameMetadata } from '@/lib/bgg-api';
import type { BGGVersion } from '@/lib/bgg-types';
import type { Json } from '@/lib/supabase/database.types';
import { handleApiError } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

// Type for game data from database with versions (standalone, not extending GameRow)
interface GameDataWithVersions {
  id: number;
  name: string;
  thumbnail: string | null;
  image: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean | null;
  yearpublished: number | null;
  versions: Json | null;
  description: string | null;
  designers: Json | null;
  bayesaverage: number | null;
}

// Type for seller trust data
interface SellerTrust {
  user_id: string;
  total_reviews: number;
  average_rating: number;
  total_completed_sales: number;
  member_since: string | null;
}

// Type for seller identity data
interface SellerIdentity {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string | null;
}

// Type for wanted listing from database
interface WantedListingData {
  id: string;
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;
  version_source: string;
  bgg_version_id: number | null;
  version_name: string | null;
  publisher: string | null;
  language: string | null;
  edition_year: number | null;
  version_thumbnail: string | null;
  version_image: string | null;
  min_price: number | null;
  max_price: number;
  currency: string;
  acceptable_conditions: string[];
  preferred_language: string | null;
  location_preferences: string | null;
  notes: string | null;
  expansion_preference: string;
  buyer_id: string;
  status: string;
  response_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  buyer: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    country: string | null;
  } | null;
}

/**
 * GET /api/games/[id]/offers
 *
 * Fetches all active offers (listings) for a specific game.
 * Returns game metadata plus all available offers sorted by price.
 *
 * Query params:
 * - sort: Sort order (price_asc, price_desc, condition, newest)
 * - condition: Filter by condition(s)
 * - listingType: Filter by listing type (instant_buy, contact_seller)
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
    const listingType = searchParams.get('listingType');

    const supabase = await createServerSupabase();

    // Fetch game metadata including versions for version-specific images
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('id, name, thumbnail, image, player_count, min_age, playing_time, is_expansion, yearpublished, versions, description, designers, bayesaverage')
      .eq('id', bggId)
      .single();

    if (gameError && gameError.code !== 'PGRST116') {
      logger.error({ bggId, error: gameError }, 'Game fetch error');
    }

    // On-demand metadata refresh: If description or designers are missing, fetch from BGG
    let enrichedGameData = gameData as GameDataWithVersions | null;
    if (gameData && (!gameData.description || !gameData.designers)) {
      logger.info({ bggId, gameName: gameData.name }, 'Missing metadata, fetching from BGG');
      try {
        const bggMetadata = await fetchGameMetadata(bggId);
        if (bggMetadata) {
          // Update database with fresh metadata (fire and forget - don't block response)
          (async () => {
            try {
              await supabase
                .from('games')
                .update({
                  description: bggMetadata.description || null,
                  designers: bggMetadata.designers?.length ? bggMetadata.designers : null,
                  bayesaverage: bggMetadata.bayesaverage || gameData.bayesaverage || null,
                  player_count: bggMetadata.playerCount || gameData.player_count || null,
                  min_age: bggMetadata.minAge || gameData.min_age || null,
                  playing_time: bggMetadata.playingTime || gameData.playing_time || null,
                  metadata_fetched_at: new Date().toISOString(),
                })
                .eq('id', bggId);
              logger.info({ bggId, gameName: gameData.name }, 'Updated metadata');
            } catch (err) {
              logger.error({ bggId, error: err }, 'Failed to update metadata');
            }
          })();

          // Use fresh data for this response
          enrichedGameData = {
            ...gameData,
            description: bggMetadata.description || gameData.description,
            designers: bggMetadata.designers?.length ? bggMetadata.designers : gameData.designers,
            bayesaverage: bggMetadata.bayesaverage || gameData.bayesaverage,
            player_count: bggMetadata.playerCount || gameData.player_count,
            min_age: bggMetadata.minAge || gameData.min_age,
            playing_time: bggMetadata.playingTime || gameData.playing_time,
          } as GameDataWithVersions;
        }
      } catch (err) {
        logger.error({ bggId, error: err }, 'BGG fetch failed');
        // Continue with existing data
      }
    }

    // Find expansion games grouped under this base game (with metadata for images)
    const { data: childExpansions } = await supabase
      .from('games')
      .select('id, name, thumbnail, image, versions')
      .eq('parent_bgg_id', bggId);

    // If game doesn't exist in DB and has no expansion data, return 404
    if (!enrichedGameData) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const expansionIds = childExpansions?.map(g => g.id) || [];
    const allGameIds = [bggId, ...expansionIds];

    // Build a map of expansion game metadata for per-listing image resolution
    const expansionGamesMap = new Map<number, { name: string; thumbnail: string | null; image: string | null; versions: Json | null }>();
    if (childExpansions) {
      for (const exp of childExpansions) {
        expansionGamesMap.set(exp.id, { name: exp.name, thumbnail: exp.thumbnail, image: exp.image, versions: exp.versions });
      }
    }

    // Build query for listings (seller trust fetched separately - no FK exists)
    // Note: We include reserved listings so they can be shown with "Reserved" indicator
    // Include expansion listings so they appear on the base game page
    let query = supabase
      .from('listings')
      .select(`
        *
      `)
      .in('bgg_game_id', allGameIds)
      .eq('status', 'active');

    // Apply condition filter
    if (conditions.length > 0) {
      query = query.in('condition', conditions);
    }

    // Apply listing type filter
    if (listingType && ['instant_buy', 'contact_seller'].includes(listingType)) {
      query = query.eq('listing_type', listingType);
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
      throw new Error(`Failed to fetch offers: ${listingsError.message}`);
    }

    // Fetch seller trust data AND profile data separately
    // We fetch public_seller_profiles (trust) and public_profiles (identity)
    let sellerTrustMap = new Map<string, SellerTrust>();
    let sellerProfileMap = new Map<string, SellerIdentity>();

    if (listings && listings.length > 0) {
      const sellerIds = [...new Set(listings.map((l) => l.seller_id))] as string[];

      // 1. Fetch Trust Stats
      const { data: sellerTrust } = await supabase
        .from('public_seller_profiles')
        .select('*')
        .in('user_id', sellerIds);

      if (sellerTrust) {
        sellerTrustMap = new Map(sellerTrust.map((p) => [p.user_id as string, p as unknown as SellerTrust]));
      }

      // 2. Fetch Identity (Name, Avatar, Country)
      const { data: sellerIdentity, error: identityError } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url, country, created_at')
        .in('id', sellerIds);

      if (identityError) {
        logger.error({ sellerIds, error: identityError }, 'Failed to fetch seller profiles - possible RLS issue');
      }

      if (sellerIdentity) {
        sellerProfileMap = new Map(sellerIdentity.map((p) => [p.id as string, p as SellerIdentity]));
        logger.debug({ fetchedCount: sellerIdentity.length, requestedCount: sellerIds.length }, 'Fetched seller profiles');

        // Log any missing profiles
        const missingProfiles = sellerIds.filter((id) => !sellerProfileMap.has(id));
        if (missingProfiles.length > 0) {
          logger.warn({ missingProfiles }, 'Missing seller profiles');
        }
      } else {
        logger.warn('No seller profiles returned');
      }
    }

    // If no game data from games table, use data from first listing
    const firstListing = listings?.[0];
    const gameName = enrichedGameData?.name || firstListing?.game_name || 'Unknown Game';
    const gameYear = enrichedGameData?.yearpublished || firstListing?.game_year || null;

    // Add game metadata to each listing with version-specific images
    const offersWithGame = (listings || []).map((listing) => {
      // For expansion listings, use the expansion game's metadata for images
      const isExpansionListing = listing.bgg_game_id !== bggId;
      const expansionData = isExpansionListing ? expansionGamesMap.get(listing.bgg_game_id) : null;

      // Look up version-specific images if bgg_version_id exists
      let versionThumbnail: string | null = null;
      let versionImage: string | null = null;

      // Check versions from the appropriate game (expansion or base)
      const versionsSource = isExpansionListing ? expansionData?.versions : enrichedGameData?.versions;
      if (listing.bgg_version_id && versionsSource) {
        const versions = versionsSource as unknown as BGGVersion[];
        const version = versions.find((v) => v.id === listing.bgg_version_id);
        if (version) {
          versionThumbnail = version.thumbnail || null;
          versionImage = version.image || null;
        }
      }

      // Resolve image: version-specific > expansion game image > base game image
      const fallbackThumbnail = isExpansionListing
        ? (expansionData?.thumbnail || enrichedGameData?.thumbnail || null)
        : (enrichedGameData?.thumbnail || null);
      const fallbackImage = isExpansionListing
        ? (expansionData?.image || enrichedGameData?.image || null)
        : (enrichedGameData?.image || null);

      // Get seller trust data from the separate query
      const sellerTrust = sellerTrustMap.get(listing.seller_id);
      const sellerIdentity = sellerProfileMap.get(listing.seller_id);

      return {
        ...listing,
        // Cast included_expansions from Json to proper type
        included_expansions: listing.included_expansions as unknown as ListingWithSeller['included_expansions'],
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
          member_since: sellerTrust?.member_since ?? sellerIdentity?.created_at ?? null,
        },
        game: {
          // Use version-specific image if available, then expansion/base game image
          thumbnail: versionThumbnail || fallbackThumbnail,
          image: versionImage || fallbackImage,
          player_count: enrichedGameData?.player_count || null,
          min_age: enrichedGameData?.min_age || null,
          playing_time: enrichedGameData?.playing_time || null,
          // Mark expansion listings so OfferCard can show expansion badge
          is_expansion: listing.bgg_game_id !== bggId || (enrichedGameData?.is_expansion || false),
        },
      };
    }) as ListingWithSeller[];

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
      image: enrichedGameData?.image || null,
      thumbnail: enrichedGameData?.thumbnail || null,
      player_count: enrichedGameData?.player_count || null,
      min_age: enrichedGameData?.min_age || null,
      playing_time: enrichedGameData?.playing_time || null,
      is_expansion: enrichedGameData?.is_expansion || false,
      description: enrichedGameData?.description || null,
      designers: (enrichedGameData?.designers as string[] | null) || null,
      rating: enrichedGameData?.bayesaverage ?? null,
      offers: offersWithGame,
      offer_count: offersWithGame.length,
      lowest_price: lowestPrice,
      highest_price: highestPrice,
    };

    logger.info({ bggId, gameName, offerCount: offersWithGame.length }, 'Returning offers');

    // Fetch active wanted listings for this game
    let wantedListings: WantedListingWithDetails[] = [];
    try {
      const { data: wantedData, error: wantedError } = await supabase
        .from('wanted_listings')
        .select(`
          *,
          buyer:user_profiles!wanted_listings_buyer_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            country
          )
        `)
        .eq('bgg_game_id', bggId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (wantedError) {
        logger.error({ bggId, error: wantedError }, 'Wanted listings fetch error');
      } else if (wantedData) {
        // Add game metadata to wanted listings
        wantedListings = (wantedData as unknown as WantedListingData[]).map((wl) => ({
          ...wl,
          buyer: wl.buyer || { id: '', full_name: '', email: '', avatar_url: null, country: null },
          game: {
            thumbnail: enrichedGameData?.thumbnail || null,
            image: enrichedGameData?.image || null,
            player_count: enrichedGameData?.player_count || null,
            min_age: enrichedGameData?.min_age || null,
            playing_time: enrichedGameData?.playing_time || null,
            is_expansion: enrichedGameData?.is_expansion || false,
          },
        })) as WantedListingWithDetails[];
        logger.info({ bggId, gameName, wantedCount: wantedListings.length }, 'Found wanted listings');
      }
    } catch (wantedErr) {
      logger.error({ bggId, error: wantedErr }, 'Failed to fetch wanted listings');
    }

    const response: GameOffersResponse = {
      game: gameWithOffers,
      wantedListings,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Fetch offers');
  }
}
