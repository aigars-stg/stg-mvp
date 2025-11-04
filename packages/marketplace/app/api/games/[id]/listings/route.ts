import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gameId } = params;
    const { searchParams } = new URL(request.url);
    const excludeListingId = searchParams.get('excludeListing');
    const excludeSellerId = searchParams.get('excludeSeller');

    console.log(`📋 [Game Listings] Fetching listings for game ${gameId}`);

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
      .eq('bgg_game_id', gameId)
      .eq('status', 'active')
      .order('price', { ascending: true }) // Sort by price for comparison
      .limit(10);

    // Exclude current listing if specified
    if (excludeListingId) {
      query = query.neq('id', excludeListingId);
    }

    // Exclude current seller if specified
    if (excludeSellerId) {
      query = query.neq('seller_id', excludeSellerId);
    }

    const { data: listings, error } = await query;

    if (error) {
      console.error('❌ [Game Listings] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch game listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game metadata for each listing
    if (listings && listings.length > 0) {
      const { data: game } = await (supabase as any)
        .from('games')
        .select('id, thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
        .eq('id', gameId)
        .single();

      if (game) {
        listings.forEach((listing: any) => {
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
        });
      }
    }

    console.log(`✅ [Game Listings] Found ${listings?.length || 0} listings for game ${gameId}`);

    return NextResponse.json({ listings: listings || [] });
  } catch (error: any) {
    console.error('❌ [Game Listings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game listings', details: error.message },
      { status: 500 }
    );
  }
}
