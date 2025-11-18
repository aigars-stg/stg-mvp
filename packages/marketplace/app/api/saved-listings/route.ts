import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/saved-listings
 * Fetches all saved listings for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📚 [Saved Listings] Fetching saved listings');

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
        { error: 'You must be signed in to view saved listings' },
        { status: 401 }
      );
    }

    // Fetch saved listings with full listing details
    const { data: savedListings, error } = await (supabase as any)
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
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('❌ [Saved Listings] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game data for each listing
    if (savedListings && savedListings.length > 0) {
      for (const savedListing of savedListings) {
        if (savedListing.listing) {
          const { data: game } = await (supabase as any)
            .from('games')
            .select('thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
            .eq('id', savedListing.listing.bgg_game_id)
            .single();

          if (game) {
            // Fetch version-specific images if bgg_version_id exists
            let versionThumbnail = null;
            let versionImage = null;

            if (savedListing.listing.bgg_version_id && game.versions) {
              const version = game.versions.find((v: any) => v.id === savedListing.listing.bgg_version_id);
              if (version) {
                versionThumbnail = version.thumbnail;
                versionImage = version.image;
              }
            }

            savedListing.listing.game = {
              thumbnail: versionThumbnail || game.thumbnail,
              image: versionImage || game.image,
              player_count: game.player_count,
              min_age: game.min_age,
              playing_time: game.playing_time,
              is_expansion: game.is_expansion
            };
          } else {
            savedListing.listing.game = {
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

    console.log(`✅ [Saved Listings] Found ${savedListings?.length || 0} saved listings`);

    return NextResponse.json({ savedListings: savedListings || [] });
  } catch (error: any) {
    console.error('❌ [Saved Listings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved listings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-listings
 * Creates a new saved listing
 * Body: { listing_id: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listing_id, notes } = body;

    console.log(`💾 [Save Listing] Saving listing ${listing_id}`);

    if (!listing_id) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 }
      );
    }

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
        { error: 'You must be signed in to save a listing' },
        { status: 401 }
      );
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await (supabase as any)
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
    const { data: savedListing, error: saveError } = await (supabase as any)
      .from('saved_listings')
      .insert({
        user_id: user.id,
        listing_id,
        notes: notes || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ [Save Listing] Save error:', saveError);

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

    console.log(`✅ [Save Listing] Successfully saved listing ${listing_id}`);

    return NextResponse.json({
      savedListing,
      message: 'Listing saved successfully',
    });
  } catch (error: any) {
    console.error('❌ [Save Listing] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to save listing', details: error.message },
      { status: 500 }
    );
  }
}
