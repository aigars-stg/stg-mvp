import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerSupabase } from '@/lib/supabase/server';
import type { AggregatedGame, AggregatedGamesResponse } from '@/lib/types/aggregated-game';
import type { ListingCondition } from '@/lib/types/listing';

// Type for listing with seller join
interface ListingWithSeller {
  id: string;
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;
  price: number;
  pricing_format: string;
  transaction_method: string;
  auction_current_bid: number | null;
  auction_start_price: number | null;
  auction_ends_at: string | null;
  condition: ListingCondition | null;
  language: string | null;
  shipping_local_pickup: boolean;
  shipping_parcel_locker: boolean;
  included_expansions: unknown[] | null;
  created_at: string;
  reserved_until: string | null;
  seller: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
  } | null;
}

// Type for game metadata
interface GameMetadata {
  id: number;
  name: string;
  thumbnail: string | null;
  image: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean;
  parent_bgg_id: number | null;
}

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
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
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
    const pricingFormat = searchParams.get('pricingFormat'); // 'fixed_price' | 'auction' | null
    const includeEnded = searchParams.get('includeEnded') === 'true';

    const supabase = await createServerSupabase();

    // Build query for active listings with seller info
    // Note: We include reserved listings so they can be shown with "Reserved" indicator
    let query = supabase
      .from('listings')
      .select(`
        id,
        bgg_game_id,
        game_name,
        game_year,
        price,
        pricing_format,
        transaction_method,
        auction_current_bid,
        auction_start_price,
        auction_ends_at,
        condition,
        language,
        shipping_local_pickup,
        shipping_parcel_locker,
        included_expansions,
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

    // Filter by pricing format (For Sale vs Auctions tab)
    if (pricingFormat === 'fixed_price') {
      query = query.neq('pricing_format', 'auction');
    } else if (pricingFormat === 'auction') {
      query = query.eq('pricing_format', 'auction');
      // By default, only include auctions that haven't ended
      if (!includeEnded) {
        query = query.gt('auction_ends_at', new Date().toISOString());
      }
    }

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

    // Cast listings to proper type
    const typedListings = (listings || []) as unknown as ListingWithSeller[];

    // Get unique game IDs for fetching game metadata
    const gameIds = [...new Set(typedListings.map((l) => l.bgg_game_id))];

    // Fetch game metadata
    let gamesMap = new Map<number, GameMetadata>();
    if (gameIds.length > 0) {
      const { data: games } = await supabase
        .from('games')
        .select('id, name, thumbnail, image, player_count, min_age, playing_time, is_expansion, parent_bgg_id')
        .in('id', gameIds);

      if (games) {
        gamesMap = new Map((games as GameMetadata[]).map((g) => [g.id, g]));
      }
    }

    // Fetch parent game metadata for expansions that will be grouped
    const parentIdsNeeded = new Set<number>();
    for (const [, gameData] of gamesMap) {
      if (gameData.is_expansion && gameData.parent_bgg_id && !gamesMap.has(gameData.parent_bgg_id)) {
        parentIdsNeeded.add(gameData.parent_bgg_id);
      }
    }

    if (parentIdsNeeded.size > 0) {
      const { data: parentGames } = await supabase
        .from('games')
        .select('id, name, thumbnail, image, player_count, min_age, playing_time, is_expansion, parent_bgg_id')
        .in('id', [...parentIdsNeeded]);

      if (parentGames) {
        for (const g of parentGames as GameMetadata[]) {
          gamesMap.set(g.id, g);
        }
      }
    }

    // Group listings by game and aggregate (expansion listings grouped under parent)
    const gameMap = new Map<number, {
      listings: ListingWithSeller[];
      game: GameMetadata | null;
      newest_listing_date: string | null;
      expansionGameIds: Set<number>;
    }>();

    for (const listing of typedListings) {
      const listingGameId = listing.bgg_game_id;
      const gameData = gamesMap.get(listingGameId);

      // Determine group key: remap expansion listings to their parent game
      let groupKey = listingGameId;
      let groupGameData = gameData;

      if (gameData?.is_expansion && gameData.parent_bgg_id) {
        const parentData = gamesMap.get(gameData.parent_bgg_id);
        if (parentData) {
          groupKey = gameData.parent_bgg_id;
          groupGameData = parentData;
        }
        // If parent not in gamesMap, falls through as own card
      } else if (gameData?.is_expansion && !gameData.parent_bgg_id) {
        // Ungrouped expansion (parent not yet backfilled) — skip unless includeExpansions
        if (!includeExpansions) continue;
      }

      // Apply game-level filters using the group's game data
      if (groupGameData) {
        // Filter by player count
        if (minPlayers !== undefined || maxPlayers !== undefined) {
          const playerCount = groupGameData.player_count;
          if (playerCount) {
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
        if (minAge !== undefined && groupGameData.min_age && groupGameData.min_age > minAge) {
          continue;
        }

        // Filter by play time
        if (maxPlayTime !== undefined && groupGameData.playing_time) {
          const playTime = parseInt(groupGameData.playing_time);
          if (!isNaN(playTime) && playTime > maxPlayTime) continue;
        }
      }

      if (!gameMap.has(groupKey)) {
        gameMap.set(groupKey, {
          listings: [],
          game: groupGameData || null,
          newest_listing_date: listing.created_at,
          expansionGameIds: new Set(),
        });
      } else {
        const existing = gameMap.get(groupKey)!;
        if (listing.created_at > (existing.newest_listing_date || '')) {
          existing.newest_listing_date = listing.created_at;
        }
      }

      gameMap.get(groupKey)!.listings.push(listing);

      // Track which expansion games are grouped under this card
      if (listingGameId !== groupKey) {
        gameMap.get(groupKey)!.expansionGameIds.add(listingGameId);
      }
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
      let soonestAuctionEndsAt: string | null = null;
      let auctionEndedCount = 0;

      // Split pricing and counts by listing type
      let instantBuyLowestPrice = Infinity;
      let instantBuyCount = 0;
      let contactSellerCount = 0;
      let auctionCount = 0;
      let auctionLowestPrice = Infinity;
      let hasBundledExpansions = false;

      // Track cheapest non-auction and cheapest auction separately
      let cheapestNonAuction: ListingWithSeller | null = null;
      let cheapestNonAuctionPrice = Infinity;
      let cheapestAuction: ListingWithSeller | null = null;
      let cheapestAuctionPrice = Infinity;

      for (const listing of gameListings) {
        // For auctions, use current bid or starting price; for fixed price, use price
        const isAuction = listing.pricing_format === 'auction';
        const isContactSeller = listing.transaction_method === 'contact_seller';
        const effectivePrice = isAuction
          ? (listing.auction_current_bid || listing.auction_start_price || listing.price)
          : listing.price;

        // Split tracking by listing type
        if (isAuction) {
          auctionCount++;
          if (effectivePrice < auctionLowestPrice) auctionLowestPrice = effectivePrice;
          if (effectivePrice < cheapestAuctionPrice) {
            cheapestAuction = listing;
            cheapestAuctionPrice = effectivePrice;
          }
          if (listing.auction_ends_at) {
            if (listing.auction_ends_at > new Date().toISOString()) {
              if (!soonestAuctionEndsAt || listing.auction_ends_at < soonestAuctionEndsAt) {
                soonestAuctionEndsAt = listing.auction_ends_at;
              }
            } else {
              auctionEndedCount++;
            }
          }
        } else {
          if (isContactSeller) {
            contactSellerCount++;
          } else {
            instantBuyCount++;
          }
          // Both instant-buy and contact-seller feed into the primary price
          if (effectivePrice < instantBuyLowestPrice) instantBuyLowestPrice = effectivePrice;
          if (effectivePrice < cheapestNonAuctionPrice) {
            cheapestNonAuction = listing;
            cheapestNonAuctionPrice = effectivePrice;
          }
        }

        // Check for bundled expansions
        if (listing.included_expansions && Array.isArray(listing.included_expansions) && listing.included_expansions.length > 0) {
          hasBundledExpansions = true;
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

      // Prefer non-auction listing as featured; fall back to auction-only
      const cheapest = cheapestNonAuction || cheapestAuction;

      // Filter by language: skip game if it doesn't have any matching language
      if (languages.length > 0) {
        const hasMatchingLanguage = languages.some(lang => gameLanguages.has(lang));
        if (!hasMatchingLanguage) continue;
      }

      // Safety check: skip if no cheapest listing found (shouldn't happen since we check gameListings.length > 0)
      if (!cheapest) continue;

      const aggregated: AggregatedGame = {
        bgg_game_id: gameId,
        game_name: game?.name || cheapest.game_name,
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
        instant_buy_lowest_price: instantBuyLowestPrice === Infinity ? null : instantBuyLowestPrice,
        auction_lowest_price: auctionLowestPrice === Infinity ? null : auctionLowestPrice,
        instant_buy_count: instantBuyCount,
        contact_seller_count: contactSellerCount,
        auction_count: auctionCount,
        has_bundled_expansions: hasBundledExpansions,
        has_expansion_listings: data.expansionGameIds.size > 0,
        conditions: [...conditions] as ListingCondition[],
        languages: [...gameLanguages].sort(),
        seller_countries: [...sellerCountries],
        has_local_pickup: hasLocalPickup,
        has_parcel_shipping: hasParcelShipping,
        has_auction: hasAuction,
        auction_soonest_ends_at: soonestAuctionEndsAt,
        auction_ended_count: auctionEndedCount,
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
        aggregatedGames.sort((a, b) => {
          const priceA = a.instant_buy_lowest_price ?? a.auction_lowest_price ?? Infinity;
          const priceB = b.instant_buy_lowest_price ?? b.auction_lowest_price ?? Infinity;
          return priceA - priceB;
        });
        break;
      case 'price_desc':
        aggregatedGames.sort((a, b) => {
          const priceA = a.instant_buy_lowest_price ?? a.auction_lowest_price ?? 0;
          const priceB = b.instant_buy_lowest_price ?? b.auction_lowest_price ?? 0;
          return priceB - priceA;
        });
        break;
      case 'offers':
        aggregatedGames.sort((a, b) => b.offer_count - a.offer_count);
        break;
      case 'name':
        aggregatedGames.sort((a, b) => a.game_name.localeCompare(b.game_name));
        break;
      case 'ending_soon':
        // Sort by soonest ending auction (for Auctions tab)
        aggregatedGames.sort((a, b) => {
          const endA = a.auction_soonest_ends_at || '';
          const endB = b.auction_soonest_ends_at || '';
          // Nulls last: games without active auctions go to the end
          if (!endA && !endB) return 0;
          if (!endA) return 1;
          if (!endB) return -1;
          return endA.localeCompare(endB);
        });
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
