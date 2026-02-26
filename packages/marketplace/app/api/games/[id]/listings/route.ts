import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { BGGVersion } from '@/lib/bgg-types';
import type { Json } from '@/lib/supabase/database.types';

// Type for listing with seller from the join query (standalone)
interface ListingWithSellerData {
  id: string;
  bgg_game_id: number;
  seller_id: string;
  bgg_version_id: number | null;
  price: number;
  condition: string;
  status: string;
  game_name: string;
  game_year: number | null;
  seller: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  game?: {
    thumbnail: string | null;
    image: string | null;
    player_count: string | null;
    min_age: number | null;
    playing_time: string | null;
    is_expansion: boolean | null;
  };
  [key: string]: unknown; // Allow other properties from the listing
}

// Type for game with versions (standalone)
interface GameWithVersions {
  id: number;
  name: string;
  thumbnail: string | null;
  image: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean | null;
  versions: Json | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: gameId } = params;
    const bggId = parseInt(gameId, 10);
    if (isNaN(bggId) || bggId < 0 || bggId > 2147483647) {
      return NextResponse.json({ listings: [] });
    }

    const { searchParams } = new URL(request.url);
    const excludeListingId = searchParams.get('excludeListing');
    const excludeSellerId = searchParams.get('excludeSeller');

    const supabase = await createServerSupabase();

    // Build query
    let query = supabase
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
      .eq('bgg_game_id', bggId)
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
      return NextResponse.json(
        { error: 'Failed to fetch game listings', details: error.message },
        { status: 500 }
      );
    }

    // Cast listings to typed array
    const typedListings = listings as unknown as ListingWithSellerData[];

    // Fetch game metadata for each listing
    if (typedListings && typedListings.length > 0) {
      const { data: game } = await supabase
        .from('games')
        .select('id, thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
        .eq('id', bggId)
        .single();

      if (game) {
        const gameWithVersions = game as GameWithVersions;
        typedListings.forEach((listing) => {
          // Check for version-specific images
          let versionThumbnail: string | null = null;
          let versionImage: string | null = null;

          if (listing.bgg_version_id && gameWithVersions.versions) {
            const versions = gameWithVersions.versions as unknown as BGGVersion[];
            const version = versions.find((v) => v.id === listing.bgg_version_id);
            if (version) {
              versionThumbnail = version.thumbnail || null;
              versionImage = version.image || null;
            }
          }

          listing.game = {
            thumbnail: versionThumbnail || gameWithVersions.thumbnail,
            image: versionImage || gameWithVersions.image,
            player_count: gameWithVersions.player_count,
            min_age: gameWithVersions.min_age,
            playing_time: gameWithVersions.playing_time,
            is_expansion: gameWithVersions.is_expansion
          };
        });
      }
    }

    return NextResponse.json({ listings: typedListings || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch game listings', details: message },
      { status: 500 }
    );
  }
}
