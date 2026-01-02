import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/wanted
 * Creates a new wanted listing (ISO)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to create a wanted listing' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      selectedGame,
      selectedVersion,
      minPrice,
      maxPrice,
      acceptableConditions,
      preferredLanguage,
      locationPreferences,
      notes,
    } = body;

    // Validation
    if (!selectedGame || !selectedGame.id) {
      return NextResponse.json({ error: 'Game is required' }, { status: 400 });
    }

    if (!selectedVersion) {
      return NextResponse.json({ error: 'Game version/edition is required' }, { status: 400 });
    }

    if (!maxPrice || parseFloat(maxPrice) <= 0) {
      return NextResponse.json({ error: 'Maximum price is required' }, { status: 400 });
    }

    if (minPrice && parseFloat(minPrice) >= parseFloat(maxPrice)) {
      return NextResponse.json(
        { error: 'Minimum price must be less than maximum price' },
        { status: 400 }
      );
    }

    if (!acceptableConditions || acceptableConditions.length === 0) {
      return NextResponse.json(
        { error: 'At least one acceptable condition is required' },
        { status: 400 }
      );
    }

    // Validate conditions array
    const validConditions = ['likeNew', 'veryGood', 'good', 'acceptable'];
    const invalidConditions = acceptableConditions.filter(
      (c: string) => !validConditions.includes(c)
    );
    if (invalidConditions.length > 0) {
      return NextResponse.json(
        { error: `Invalid conditions: ${invalidConditions.join(', ')}` },
        { status: 400 }
      );
    }

    // Buyer ID comes from authenticated session
    const buyerId = user.id;

    // Prepare wanted listing data
    const wantedListingData = {
      // Game reference
      bgg_game_id: selectedGame.id,
      game_name: selectedGame.name,
      game_year: selectedGame.yearPublished || null,

      // Version/Edition information
      version_source: 'bgg',
      bgg_version_id: selectedVersion.id || null,
      version_name: selectedVersion.name || null,
      publisher: selectedVersion.publishers?.join(' | ') || selectedVersion.publisher || null,
      language: selectedVersion.languages?.join(' | ') || selectedVersion.language || null,
      edition_year: selectedVersion.yearPublished || null,
      version_thumbnail: selectedVersion.thumbnail || null,
      version_image: selectedVersion.image || null,

      // Budget
      min_price: minPrice ? parseFloat(minPrice) : null,
      max_price: parseFloat(maxPrice),
      currency: 'EUR',

      // Preferences
      acceptable_conditions: acceptableConditions,
      preferred_language: preferredLanguage || null,
      location_preferences: locationPreferences || null,
      notes: notes || null,

      // Metadata
      buyer_id: buyerId,
      status: 'active',
      // expires_at defaults to NOW() + 30 days (set in DB)
    };

    // Insert wanted listing into database
    const { data: wantedListing, error: insertError } = await (supabase as any)
      .from('wanted_listings')
      .insert(wantedListingData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Failed to create wanted listing',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      wantedListing,
      message: 'Wanted listing created successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create wanted listing',
        details: message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wanted
 *
 * Fetches wanted listings with optional filtering and pagination:
 * - ?gameId=123 - Get wanted listings for a specific game
 * - ?buyerId=xyz - Get wanted listings by a specific buyer
 * - ?status=active - Filter by status (default: active for public browse)
 * - ?page=1 - Page number (default: 1)
 * - ?limit=20 - Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const buyerId = searchParams.get('buyerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Calculate offset for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const supabase = await createServerSupabase();

    // Build query with buyer profile join
    let query = (supabase as any)
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
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Apply filters
    if (gameId) {
      query = query.eq('bgg_game_id', parseInt(gameId));
    }

    if (buyerId) {
      // When filtering by buyer, show all their wanted listings
      query = query.eq('buyer_id', buyerId);
    } else if (!status) {
      // For public browse, only show active wanted listings by default
      query = query.eq('status', 'active');
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: wantedListings, error, count } = await query;

    if (error) {
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
    }

    const total = count || 0;
    const hasMore = (from + (wantedListings?.length || 0)) < total;

    return NextResponse.json({
      wantedListings: wantedListings || [],
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch wanted listings', details: message },
      { status: 500 }
    );
  }
}
