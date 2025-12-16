import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

    console.log(`🎮 [Get Games] Fetching aggregated games - page: ${page}, limit: ${limit}, search: ${search || 'none'}`);

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

    // Build query for active listings with seller info
    let query = (supabase as any)
      .from('listings')
      .select(`
        id,
        bgg_game_id,
        game_name,
        game_year,
        price,
        condition,
        language,
        shipping_local_pickup,
        shipping_parcel_locker,
        created_at,
        seller:user_profiles!seller_id (
          id,
          full_name,
          avatar_url,
          country
        )
      `)
      .eq('status', 'active')
      // Show listings that are not reserved OR where reservation has expired
      .or(`reserved_by.is.null,reserved_until.lt.${new Date().toISOString()}`);

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
      console.error('❌ [Get Games] Query error:', error);
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
        });
      }

      gameMap.get(gameId)!.listings.push(listing);
    }

    // Build aggregated games array
    const aggregatedGames: AggregatedGame[] = [];

    for (const [gameId, data] of gameMap) {
      const { listings: gameListings, game } = data;
      if (gameListings.length === 0) continue;

      // Sort listings by price to get cheapest
      gameListings.sort((a: any, b: any) => a.price - b.price);
      const cheapest = gameListings[0];

      // Collect unique values
      const conditions = [...new Set(gameListings.map((l: any) => l.condition))] as ListingCondition[];
      const sellerCountries = [...new Set(
        gameListings
          .map((l: any) => l.seller?.country)
          .filter(Boolean)
      )] as string[];

      // Collect unique languages (handle comma-separated values)
      const gameLanguages = new Set<string>();
      gameListings.forEach((l: any) => {
        if (l.language) {
          l.language.split(',').forEach((lang: string) => {
            const trimmed = lang.trim();
            if (trimmed) gameLanguages.add(trimmed);
          });
        }
      });

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
        lowest_price: Math.min(...gameListings.map((l: any) => l.price)),
        highest_price: Math.max(...gameListings.map((l: any) => l.price)),
        conditions,
        languages: Array.from(gameLanguages).sort(),
        seller_countries: sellerCountries,
        has_local_pickup: gameListings.some((l: any) => l.shipping_local_pickup),
        has_parcel_shipping: gameListings.some((l: any) => l.shipping_parcel_locker),
        featured_listing_id: cheapest.id,
        featured_seller: {
          id: cheapest.seller?.id || '',
          full_name: cheapest.seller?.full_name || 'Unknown',
          avatar_url: cheapest.seller?.avatar_url || null,
          country: cheapest.seller?.country || null,
        },
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
        // Sort by most recent listing in each game group
        // For simplicity, we'll keep the current order which is based on iteration
        break;
    }

    // Apply pagination
    const total = aggregatedGames.length;
    const from = (page - 1) * limit;
    const paginatedGames = aggregatedGames.slice(from, from + limit);
    const hasMore = from + paginatedGames.length < total;

    console.log(`✅ [Get Games] Returning ${paginatedGames.length} games (page ${page}, total: ${total})`);

    const response: AggregatedGamesResponse = {
      games: paginatedGames,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [Get Games] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games', details: error.message },
      { status: 500 }
    );
  }
}
