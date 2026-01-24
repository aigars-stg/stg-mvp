import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface GameVersion {
  id: string | number;
  thumbnail?: string | null;
  image?: string | null;
}

interface GameData {
  thumbnail: string | null;
  image: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean | null;
}

interface ListingWithGame {
  game?: GameData;
  [key: string]: unknown;
}

/**
 * GET /api/saved-listings
 * Fetches all saved listings for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Fetch saved listings with full listing details
    const { data: savedListings, error } = await supabase
      .from('saved_listings')
      .select(`
        *,
        listing:listings!listing_id (
          *,
          seller:user_profiles!seller_id (
            id,
            full_name,
            email,
            avatar_url,
            country
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch saved listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game data for each listing
    if (savedListings && savedListings.length > 0) {
      for (const savedListing of savedListings) {
        if (savedListing.listing) {
          const { data: game } = await supabase
            .from('games')
            .select('thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
            .eq('id', savedListing.listing.bgg_game_id)
            .single();

          if (game) {
            // Fetch version-specific images if bgg_version_id exists
            let versionThumbnail = null;
            let versionImage = null;

            if (savedListing.listing.bgg_version_id && game.versions) {
              const versions = game.versions as unknown as GameVersion[];
              const version = versions.find((v) => String(v.id) === String(savedListing.listing.bgg_version_id));
              if (version) {
                versionThumbnail = version.thumbnail;
                versionImage = version.image;
              }
            }

            (savedListing.listing as ListingWithGame).game = {
              thumbnail: versionThumbnail || game.thumbnail,
              image: versionImage || game.image,
              player_count: game.player_count,
              min_age: game.min_age,
              playing_time: game.playing_time,
              is_expansion: game.is_expansion
            };
          } else {
            (savedListing.listing as ListingWithGame).game = {
              thumbnail: null,
              image: null,
              player_count: null,
              min_age: null,
              playing_time: null,
              is_expansion: null
            };
          }
        }
      }
    }

    return NextResponse.json({ savedListings: savedListings || [] });
  } catch (error) {
    return handleApiError(error, 'Fetch saved listings');
  }
}

/**
 * POST /api/saved-listings
 * Creates a new saved listing
 * Body: { listing_id: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const { listing_id, notes } = body;

    if (!listing_id) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 }
      );
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Create saved listing
    const { data: savedListing, error: saveError } = await supabase
      .from('saved_listings')
      .insert({
        user_id: user.id,
        listing_id,
        notes: notes || null,
      })
      .select()
      .single();

    if (saveError) {
      // Check if already saved (unique constraint violation)
      if (saveError.code === '23505') {
        return NextResponse.json(
          { error: 'Listing is already saved' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to save listing', details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      savedListing,
      message: 'Listing saved successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Save listing');
  }
}
