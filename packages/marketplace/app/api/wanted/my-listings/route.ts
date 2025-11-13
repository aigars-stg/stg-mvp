import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/wanted/my-listings
 * Fetches all wanted listings created by the authenticated user
 * Includes all statuses (active, expired, fulfilled, cancelled)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Get My Wanted Listings] Fetching wanted listings for current user');

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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to view your wanted listings' },
        { status: 401 }
      );
    }

    // Fetch user's wanted listings (all statuses)
    const { data: wantedListings, error } = await (supabase as any)
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
      console.error('❌ [Get My Wanted Listings] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch wanted listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game images and metadata for all wanted listings
    if (wantedListings && wantedListings.length > 0) {
      const gameIds = [...new Set(wantedListings.map((wl: any) => wl.bgg_game_id))];
      const { data: games } = await (supabase as any)
        .from('games')
        .select('id, thumbnail, image, player_count, min_age, playing_time, is_expansion')
        .in('id', gameIds);

      if (games) {
        const gamesMap = new Map(games.map((g: any) => [g.id, g]));
        wantedListings.forEach((wantedListing: any) => {
          const game: any = gamesMap.get(wantedListing.bgg_game_id);

          if (game) {
            wantedListing.game = {
              thumbnail: game.thumbnail,
              image: game.image,
              player_count: game.player_count,
              min_age: game.min_age,
              playing_time: game.playing_time,
              is_expansion: game.is_expansion
            };
          } else {
            wantedListing.game = {
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
        const { data: responses } = await (supabase as any)
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

        wantedListing.responses = responses || [];
      }
    }

    console.log(`✅ [Get My Wanted Listings] Successfully fetched ${wantedListings?.length || 0} wanted listings`);

    // Group by status for easier UI consumption
    const grouped = {
      active: wantedListings?.filter((wl: any) => wl.status === 'active') || [],
      expired: wantedListings?.filter((wl: any) => wl.status === 'expired') || [],
      fulfilled: wantedListings?.filter((wl: any) => wl.status === 'fulfilled') || [],
      cancelled: wantedListings?.filter((wl: any) => wl.status === 'cancelled') || [],
    };

    return NextResponse.json({
      wantedListings: wantedListings || [],
      grouped,
      total: wantedListings?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ [Get My Wanted Listings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wanted listings', details: error.message },
      { status: 500 }
    );
  }
}
