import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import type { TypedSupabase, WantedListingRow, GameRow } from '@/lib/supabase/query-types';

/**
 * GET /api/wanted/my-listings
 * Fetches all wanted listings created by the authenticated user
 * Includes all statuses (active, expired, fulfilled, cancelled)
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Fetch user's wanted listings (all statuses)
    const { data: wantedListings, error } = await (supabase as TypedSupabase)
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
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch wanted listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game images and metadata for all wanted listings
    if (wantedListings && wantedListings.length > 0) {
      const gameIds = [...new Set(wantedListings.map((wl) => wl.bgg_game_id))];
      const { data: games } = await (supabase as TypedSupabase)
        .from('games')
        .select('id, thumbnail, image, player_count, min_age, playing_time, is_expansion')
        .in('id', gameIds);

      if (games) {
        type GameInfo = Pick<GameRow, 'id' | 'thumbnail' | 'image' | 'player_count' | 'min_age' | 'playing_time' | 'is_expansion'>;
        type WantedListingWithGame = typeof wantedListings[number] & {
          game?: {
            thumbnail: string | null;
            image: string | null;
            player_count: string | null;
            min_age: number | null;
            playing_time: string | null;
            is_expansion: boolean | null;
          };
        };
        const gamesMap = new Map(games.map((g) => [g.id, g]));
        wantedListings.forEach((wantedListing) => {
          const game: GameInfo | undefined = gamesMap.get(wantedListing.bgg_game_id);
          const wl = wantedListing as WantedListingWithGame;

          if (game) {
            wl.game = {
              thumbnail: game.thumbnail,
              image: game.image,
              player_count: game.player_count,
              min_age: game.min_age,
              playing_time: game.playing_time,
              is_expansion: game.is_expansion
            };
          } else {
            wl.game = {
              thumbnail: null,
              image: null,
              player_count: null,
              min_age: null,
              playing_time: null,
              is_expansion: null
            };
          }
        });
      }

      // Fetch response counts are already in the wanted_listings data
      // But we can also fetch full responses for each listing if needed
      for (const wantedListing of wantedListings) {
        const { data: responses } = await (supabase as TypedSupabase)
          .from('wanted_listing_responses')
          .select(`
            *,
            seller:user_profiles!wanted_listing_responses_seller_id_fkey (
              id,
              full_name,
              avatar_url,
              country
            )
          `)
          .eq('wanted_listing_id', wantedListing.id)
          .order('responded_at', { ascending: false });

        (wantedListing as unknown as { responses: typeof responses }).responses = responses || [];
      }
    }

    // Group by status for easier UI consumption
    const grouped = {
      active: wantedListings?.filter((wl) => wl.status === 'active') || [],
      expired: wantedListings?.filter((wl) => wl.status === 'expired') || [],
      fulfilled: wantedListings?.filter((wl) => wl.status === 'fulfilled') || [],
      cancelled: wantedListings?.filter((wl) => wl.status === 'cancelled') || [],
    };

    return NextResponse.json({
      wantedListings: wantedListings || [],
      grouped,
      total: wantedListings?.length || 0,
    });
  } catch (error) {
    return handleApiError(error, 'Fetch wanted listings');
  }
}
