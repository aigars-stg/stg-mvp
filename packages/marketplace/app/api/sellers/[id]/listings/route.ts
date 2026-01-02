import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

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
    let query = (supabase as any)
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
      const gameIds = [...new Set(listings.map((l: any) => l.bgg_game_id).filter(Boolean))];

      if (gameIds.length > 0) {
        const { data: games } = await (supabase as any)
          .from('games')
          .select('id, thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
          .in('id', gameIds);

        // Attach game data to listings
        if (games) {
          listings.forEach((listing: any) => {
            const game = games.find((g: any) => g.id === listing.bgg_game_id);

            if (game) {
              // Check for version-specific images
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
