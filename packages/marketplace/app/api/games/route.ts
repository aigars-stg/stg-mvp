import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerSupabase } from '@/lib/supabase/server';
import type { AggregatedGame, AggregatedGamesResponse } from '@/lib/types/aggregated-game';
import type { ListingCondition } from '@/lib/types/listing';

/**
 * GET /api/games
 *
 * Fetches aggregated games (grouped listings) with filtering and pagination.
 * Each game shows "From €X" pricing and offer count.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search game names
 * - language: Filter by language(s)
 * - minPrice, maxPrice: Price range filter
 * - country: Filter by seller country
 * - minPlayers, maxPlayers: Player count filter
 * - minAge: Minimum age filter
 * - maxPlayTime: Max playing time filter
 * - sort: Sort order (price_asc, price_desc, newest, offers, name)
 * - includeExpansions: Include expansion games (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search')?.trim();
    const languages = searchParams.getAll('language');
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const country = searchParams.get('country');
    const minPlayers = searchParams.get('minPlayers') ? parseInt(searchParams.get('minPlayers')!) : undefined;
    const maxPlayers = searchParams.get('maxPlayers') ? parseInt(searchParams.get('maxPlayers')!) : undefined;
    const minAge = searchParams.get('minAge') ? parseInt(searchParams.get('minAge')!) : undefined;
    const maxPlayTime = searchParams.get('maxPlayTime') ? parseInt(searchParams.get('maxPlayTime')!) : undefined;
    const sort = searchParams.get('sort') || 'newest';
    const includeExpansions = searchParams.get('includeExpansions') !== 'false';

    const supabase = await createServerSupabase();

    // Build query for active listings with seller info
    // Note: We include reserved listings so they can be shown with "Reserved" indicator
    let query = (supabase as any)
      .from('listings')
      .select(`
        id,
        bgg_game_id,
        game_name,
        game_year,
        price,
        pricing_format,
        auction_current_bid,
        auction_start_price,
        condition,
        language,
        shipping_local_pickup,
        shipping_parcel_locker,
        created_at,
        reserved_until,
        seller:user_profiles!seller_id (
          id,
          full_name,
          avatar_url,
          country
        )
      `)
      .eq('status', 'active');

    // Apply search filter
    if (search) {
      query = query.ilike('game_name', `%${search}%`);
    }

    // Apply price filters
    if (minPrice !== undefined) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice !== undefined) {
      query = query.lte('price', maxPrice);
    }

    // Apply country filter (seller country)
    if (country) {
      query = query.eq('seller.country', country);
    }

    const { data: listings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch games', details: error.message },
        { status: 500 }
      );
    }

    // Get unique game IDs for fetching game metadata
    const gameIds = [...new Set((listings || []).map((l: any) => l.bgg_game_id))];

    // Fetch game metadata
    let gamesMap = new Map();
    if (gameIds.length > 0) {
      const { data: games } = await (supabase as any)
        .from('games')
        .select('id, thumbnail, image, player_count, min_age, playing_time, is_expansion')
        .in('id', gameIds);

      if (games) {
        gamesMap = new Map(games.map((g: any) => [g.id, g]));
      }
    }

    // Group listings by game and aggregate
    const gameMap = new Map<number, {
      listings: any[];
      game: any;
      newest_listing_date: string | null;
    }>();

    for (const listing of listings || []) {
      const gameId = listing.bgg_game_id;
      const gameData = gamesMap.get(gameId);

      // Apply game-level filters
      if (gameData) {
        // Filter expansions
        if (!includeExpansions && gameData.is_expansion) {
          continue;
        }

        // Filter by player count
        if (minPlayers !== undefined || maxPlayers !== undefined) {
          const playerCount = gameData.player_count;
          if (playerCount) {
            // Parse player count like "2-4" or "3"
            const match = playerCount.match(/(\d+)(?:-(\d+))?/);
            if (match) {
              const minP = parseInt(match[1]);
              const maxP = match[2] ? parseInt(match[2]) : minP;
              if (minPlayers !== undefined && maxP < minPlayers) continue;
              if (maxPlayers !== undefined && minP > maxPlayers) continue;
            }
          }
        }

        // Filter by min age
        if (minAge !== undefined && gameData.min_age && gameData.min_age > minAge) {
          continue;
        }

        // Filter by play time
        if (maxPlayTime !== undefined && gameData.playing_time) {
          const playTime = parseInt(gameData.playing_time);
          if (!isNaN(playTime) && playTime > maxPlayTime) continue;
        }
      }

      if (!gameMap.has(gameId)) {
        gameMap.set(gameId, {
          listings: [],
          game: gameData || null,
          newest_listing_date: listing.created_at,
        });
      } else {
        // Track the newest listing date
        const existing = gameMap.get(gameId)!;
        if (listing.created_at > (existing.newest_listing_date || '')) {
          existing.newest_listing_date = listing.created_at;
        }
      }

      gameMap.get(gameId)!.listings.push(listing);
    }

    // Build aggregated games array
    const aggregatedGames: AggregatedGame[] = [];

    for (const [gameId, data] of gameMap) {
      const { listings: gameListings, game } = data;
      if (gameListings.length === 0) continue;

      // Single-pass aggregation: collect all metrics in one loop
      const conditions = new Set<ListingCondition>();
      const sellerCountries = new Set<string>();
      const gameLanguages = new Set<string>();
      let lowestPrice = Infinity;
      let highestPrice = -Infinity;
      let hasLocalPickup = false;
      let hasParcelShipping = false;
      let hasAuction = false;
      let cheapest: any = null;

      for (const listing of gameListings) {
        // For auctions, use current bid or starting price; for fixed price, use price
        const isAuction = listing.pricing_format === 'auction';
        const effectivePrice = isAuction
          ? (listing.auction_current_bid || listing.auction_start_price || listing.price)
          : listing.price;

        // Track cheapest listing (by effective price)
        const cheapestEffectivePrice = cheapest
          ? (cheapest.pricing_format === 'auction'
              ? (cheapest.auction_current_bid || cheapest.auction_start_price || cheapest.price)
              : cheapest.price)
          : Infinity;
        if (cheapest === null || effectivePrice < cheapestEffectivePrice) {
          cheapest = listing;
        }

        // Aggregate unique values
        if (listing.condition) conditions.add(listing.condition);
        if (listing.seller?.country) sellerCountries.add(listing.seller.country);

        // Parse languages (comma-separated)
        if (listing.language) {
          for (const lang of listing.language.split(',')) {
            const trimmed = lang.trim();
            if (trimmed) gameLanguages.add(trimmed);
          }
        }

        // Track price range (using effective price for auctions)
        if (effectivePrice < lowestPrice) lowestPrice = effectivePrice;
        if (effectivePrice > highestPrice) highestPrice = effectivePrice;

        // Track shipping options and listing types
        if (listing.shipping_local_pickup) hasLocalPickup = true;
        if (listing.shipping_parcel_locker) hasParcelShipping = true;
        if (isAuction) hasAuction = true;
      }

      // Filter by language: skip game if it doesn't have any matching language
      if (languages.length > 0) {
        const hasMatchingLanguage = languages.some(lang => gameLanguages.has(lang));
        if (!hasMatchingLanguage) continue;
      }

      const aggregated: AggregatedGame = {
        bgg_game_id: gameId,
        game_name: cheapest.game_name,
        game_year: cheapest.game_year,
        image: game?.image || null,
        thumbnail: game?.thumbnail || null,
        player_count: game?.player_count || null,
        min_age: game?.min_age || null,
        playing_time: game?.playing_time || null,
        is_expansion: game?.is_expansion || false,
        offer_count: gameListings.length,
        lowest_price: lowestPrice === Infinity ? 0 : lowestPrice,
        highest_price: highestPrice === -Infinity ? 0 : highestPrice,
        conditions: [...conditions] as ListingCondition[],
        languages: [...gameLanguages].sort(),
        seller_countries: [...sellerCountries],
        has_local_pickup: hasLocalPickup,
        has_parcel_shipping: hasParcelShipping,
        has_auction: hasAuction,
        featured_listing_id: cheapest.id,
        featured_seller: {
          id: cheapest.seller?.id || '',
          full_name: cheapest.seller?.full_name || 'Unknown',
          avatar_url: cheapest.seller?.avatar_url || null,
          country: cheapest.seller?.country || null,
        },
        newest_listing_date: data.newest_listing_date,
      };

      aggregatedGames.push(aggregated);
    }

    // Sort aggregated games
    switch (sort) {
      case 'price_asc':
        aggregatedGames.sort((a, b) => a.lowest_price - b.lowest_price);
        break;
      case 'price_desc':
        aggregatedGames.sort((a, b) => b.lowest_price - a.lowest_price);
        break;
      case 'offers':
        aggregatedGames.sort((a, b) => b.offer_count - a.offer_count);
        break;
      case 'name':
        aggregatedGames.sort((a, b) => a.game_name.localeCompare(b.game_name));
        break;
      case 'newest':
      default:
        // Sort by most recent listing in each game group (newest first)
        aggregatedGames.sort((a, b) => {
          const dateA = a.newest_listing_date || '';
          const dateB = b.newest_listing_date || '';
          return dateB.localeCompare(dateA);
        });
        break;
    }

    // Apply pagination
    const total = aggregatedGames.length;
    const from = (page - 1) * limit;
    const paginatedGames = aggregatedGames.slice(from, from + limit);
    const hasMore = from + paginatedGames.length < total;

    const response: AggregatedGamesResponse = {
      games: paginatedGames,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch games', details: message },
      { status: 500 }
    );
  }
}
