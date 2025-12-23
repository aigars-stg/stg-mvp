import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isManualVersion, type VersionSelection } from '@/lib/bgg-types';
import { cookies } from 'next/headers';

// Fixed: Added !seller_id to foreign key join for user_profiles
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [Create Listing] Starting listing creation...');

    // Create Supabase client with cookies for auth
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
      console.error('❌ [Create Listing] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'You must be signed in to create a listing' },
        { status: 401 }
      );
    }

    console.log(`📝 [Create Listing] User authenticated: ${user.id}`);

    // Check if seller has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('seller_status, stripe_connect_payouts_enabled')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      // If no seller profile exists, they need to complete onboarding
      if (profileError.code === 'PGRST116') {
        console.log(`⚠️ [Create Listing] No seller profile found for user ${user.id}`);
        return NextResponse.json(
          {
            error: 'Please complete seller onboarding first',
            requiresOnboarding: true,
            onboardingUrl: '/seller/onboard'
          },
          { status: 403 }
        );
      }
      console.error('❌ [Create Listing] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify seller status' },
        { status: 500 }
      );
    }

    // Validate seller has completed onboarding
    if (!profile?.stripe_connect_payouts_enabled || profile?.seller_status !== 'active') {
      console.log(`⚠️ [Create Listing] Seller not onboarded - status: ${profile.seller_status}, payouts: ${profile.stripe_connect_payouts_enabled}`);
      return NextResponse.json(
        {
          error: 'Please complete seller onboarding first',
          requiresOnboarding: true,
          onboardingUrl: '/seller/onboard'
        },
        { status: 403 }
      );
    }

    console.log(`✅ [Create Listing] Seller verified (status: ${profile.seller_status})`);

    const body = await request.json();
    const {
      selectedGame,
      selectedVersion,
      photoUrls, // Already uploaded photos
      condition,
      conditionNotes,
      allComponentsPresent,
      missingComponents,
      price,
      includedExpansions, // Bundled expansions
    } = body;

    // Validation
    if (!selectedGame || !selectedGame.id) {
      return NextResponse.json({ error: 'Game is required' }, { status: 400 });
    }

    if (!selectedVersion) {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 });
    }

    if (!condition) {
      return NextResponse.json({ error: 'Condition is required' }, { status: 400 });
    }

    if (!price || parseFloat(price) <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    // Seller ID comes from authenticated session
    const sellerId = user.id;

    // Determine if version is manual or from BGG
    const isManual = isManualVersion(selectedVersion as VersionSelection);

    // Prepare listing data
    const listingData = {
      // Game reference
      bgg_game_id: selectedGame.id,
      game_name: selectedGame.name,
      game_year: selectedGame.yearPublished || null,

      // Version/Language/Publisher data
      version_source: isManual ? 'manual' : 'bgg',
      bgg_version_id: isManual ? null : selectedVersion.id,
      version_name: selectedVersion.name || null,
      // Use arrays if available, join multiple values with comma
      publisher: selectedVersion.publishers?.join(', ') || selectedVersion.publisher || null,
      language: selectedVersion.languages?.join(', ') || selectedVersion.language || null,
      edition_year: selectedVersion.yearPublished || null,

      // Photos
      photo_urls: photoUrls || [],

      // Condition
      condition,
      condition_notes: conditionNotes || null,
      all_components_present: allComponentsPresent !== false, // Default to true
      missing_components: missingComponents || null,

      // Pricing
      price: parseFloat(price),

      // Shipping - T2T only (terminal-to-terminal via Unisend)
      shipping_local_pickup: false,
      shipping_parcel_locker: true,
      shipping_notes: null,

      // Bundled expansions
      included_expansions: includedExpansions || [],

      // Metadata
      seller_id: sellerId,
      status: 'active',
    };

    console.log('📝 [Create Listing] Inserting listing:', {
      game: selectedGame.name,
      version_source: listingData.version_source,
      price: listingData.price,
      photos: photoUrls.length,
    });

    // Insert listing into database
    const { data: listing, error: insertError } = await (supabase as any)
      .from('listings')
      .insert(listingData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ [Create Listing] Insert error:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to create listing',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    console.log(`✅ [Create Listing] Successfully created listing ${listing.id}`);

    return NextResponse.json({
      listing,
      message: 'Listing created successfully',
    });
  } catch (error: any) {
    console.error('❌ [Create Listing] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create listing',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/listings
 *
 * Fetches listings with optional filtering and pagination:
 * - ?gameId=123 - Get listings for a specific game
 * - ?sellerId=xyz - Get listings by a specific seller
 * - ?status=active - Filter by status (default: active for public browse, all for seller's own listings)
 * - ?page=1 - Page number (default: 1)
 * - ?limit=20 - Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Calculate offset for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log(`📋 [Get Listings] Fetching listings - gameId: ${gameId}, sellerId: ${sellerId}, status: ${status}, page: ${page}, limit: ${limit}`);

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

    // Build query with seller profile join
    // Note: We'll fetch game images and seller trust data separately to avoid join issues
    let query = (supabase as any)
      .from('listings')
      .select(`
        *
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Apply filters
    if (gameId) {
      query = query.eq('bgg_game_id', parseInt(gameId));
    }

    if (sellerId) {
      // When filtering by seller, show all their listings
      query = query.eq('seller_id', sellerId);
    } else if (!status) {
      // For public browse, only show active listings by default
      query = query.eq('status', 'active');
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: listings, error, count } = await query;

    if (error) {
      console.error('❌ [Get Listings] Query error:', JSON.stringify(error, null, 2));
      console.error('❌ [Get Listings] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { error: 'Failed to fetch listings', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game images and metadata for all listings
    if (listings && listings.length > 0) {
      const gameIds = [...new Set(listings.map((l: any) => l.bgg_game_id))];
      const { data: games } = await (supabase as any)
        .from('games')
        .select('id, thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
        .in('id', gameIds);

      // Fetch seller trust data separately (no FK between listings and seller_profiles)
      const sellerIds = [...new Set(listings.map((l: any) => l.seller_id))];

      // 1. Fetch Trust Stats
      const { data: sellerTrust } = await (supabase as any)
        .from('public_seller_profiles')
        .select('*')
        .in('user_id', sellerIds);

      // 2. Fetch Identity (Name, Avatar, Country)
      const { data: sellerIdentity } = await (supabase as any)
        .from('public_profiles')
        .select('id, full_name, avatar_url, country')
        .in('id', sellerIds);

      const trustMap = sellerTrust
        ? new Map(sellerTrust.map((p: any) => [p.user_id, p]))
        : new Map();

      const profileMap = sellerIdentity
        ? new Map(sellerIdentity.map((p: any) => [p.id, p]))
        : new Map();

      if (games) {
        const gamesMap = new Map(games.map((g: any) => [g.id, g]));
        listings.forEach((listing: any) => {
          const game: any = gamesMap.get(listing.bgg_game_id);

          if (game) {
            // Check if listing has a version-specific image
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

          // Merge seller trust data into seller object
          const sellerTrust = trustMap.get(listing.seller_id);
          const sellerProfile = profileMap.get(listing.seller_id);

          listing.seller = {
            id: listing.seller_id,
            // Profile data (Identity)
            full_name: sellerProfile?.full_name || 'Unknown Seller',
            email: '', // REMOVED EMAIL FOR SECURITY
            avatar_url: sellerProfile?.avatar_url || null,
            country: sellerProfile?.country || null,
            // Trust data
            total_reviews: sellerTrust?.total_reviews ?? 0,
            average_rating: sellerTrust?.average_rating ?? 0,
            total_completed_sales: sellerTrust?.total_completed_sales ?? 0,
            member_since: sellerTrust?.member_since ?? null,
          };
        });
      }
    }

    const total = count || 0;
    const hasMore = (from + (listings?.length || 0)) < total;

    console.log(`✅ [Get Listings] Successfully fetched ${listings?.length || 0} listings (page ${page}, total: ${total}, hasMore: ${hasMore})`);

    return NextResponse.json({
      listings: listings || [],
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('❌ [Get Listings] Unexpected error:', error);
    console.error('❌ [Get Listings] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch listings', details: error.message },
      { status: 500 }
    );
  }
}
