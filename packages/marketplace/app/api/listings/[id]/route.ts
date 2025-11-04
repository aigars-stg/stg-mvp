import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`📋 [Get Listing] Fetching listing ${id}`);

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

    // Fetch listing with seller profile
    const { data: listing, error } = await (supabase as any)
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [Get Listing] Query error:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch listing', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game images and metadata (including versions for version-specific images)
    if (listing) {
      const { data: game } = await (supabase as any)
        .from('games')
        .select('thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
        .eq('id', listing.bgg_game_id)
        .single();

      if (game) {
        // Fetch version-specific images if bgg_version_id exists
        let versionThumbnail = null;
        let versionImage = null;

        if (listing.bgg_version_id && game.versions) {
          const version = game.versions.find((v: any) => v.id === listing.bgg_version_id);
          if (version) {
            versionThumbnail = version.thumbnail;
            versionImage = version.image;
          }
        }

        // Priority: 1) Version image, 2) Base game image
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
    }

    console.log(`✅ [Get Listing] Successfully fetched listing ${id}`);

    return NextResponse.json({ listing });
  } catch (error: any) {
    console.error('❌ [Get Listing] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listing', details: error.message },
      { status: 500 }
    );
  }
}
