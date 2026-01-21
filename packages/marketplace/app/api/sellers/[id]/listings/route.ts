import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { TypedSupabase, ListingRow, GameRow } from '@/lib/supabase/query-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sellerId } = params;
    const { searchParams } = new URL(request.url);
    const excludeListingId = searchParams.get('exclude');

    const supabase = await createServerSupabase();

    // Build query
    const typedSupabase = supabase as TypedSupabase;
    let query = typedSupabase
      .from('listings')
      .select(`
        *,
        seller:user_profiles!seller_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4);

    // Exclude current listing if specified
    if (excludeListingId) {
      query = query.neq('id', excludeListingId);
    }

    const { data: listings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch seller listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game metadata for each listing
    if (listings && listings.length > 0) {
      type ListingWithSeller = ListingRow & { seller?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null; game?: Record<string, unknown> };
      const typedListings = listings as ListingWithSeller[];
      const gameIds = [...new Set(typedListings.map((l) => l.bgg_game_id).filter(Boolean))] as number[];

      if (gameIds.length > 0) {
        const { data: games } = await typedSupabase
          .from('games')
          .select('id, thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
          .in('id', gameIds);

        type GameVersion = { id: number; thumbnail?: string | null; image?: string | null };
        type GameWithVersions = Pick<GameRow, 'id' | 'thumbnail' | 'image' | 'player_count' | 'min_age' | 'playing_time' | 'is_expansion'> & { versions?: GameVersion[] | null };

        // Attach game data to listings
        if (games) {
          const typedGames = games as GameWithVersions[];
          typedListings.forEach((listing) => {
            const game = typedGames.find((g) => g.id === listing.bgg_game_id);

            if (game) {
              // Check for version-specific images
              let versionThumbnail = null;
              let versionImage = null;

              if (listing.bgg_version_id && game.versions) {
                const version = game.versions.find((v) => v.id === listing.bgg_version_id);
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
                is_expansion: game.is_expansion
              };
            } else {
              listing.game = {
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
      }
    }

    return NextResponse.json({ listings: listings || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch seller listings', details: message },
      { status: 500 }
    );
  }
}
