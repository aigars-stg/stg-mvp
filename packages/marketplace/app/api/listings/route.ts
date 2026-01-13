import { NextRequest, NextResponse } from 'next/server';
import { isManualVersion, type VersionSelection } from '@/lib/bgg-types';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { ensureGameMetadata } from '@/lib/bgg-api';

export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();

    // Extract listingType from body (default to instant_buy for backwards compatibility)
    const listingType = body.listingType || 'instant_buy';

    // Validate listing type
    if (!['instant_buy', 'contact_seller', 'auction'].includes(listingType)) {
      return NextResponse.json(
        { error: 'Invalid listing type' },
        { status: 400 }
      );
    }

    // Check if seller has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('seller_status, stripe_connect_payouts_enabled, seller_terms_accepted_at')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      // If no seller profile exists, they need to complete onboarding
      if (profileError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Please complete seller onboarding first',
            requiresOnboarding: true,
            onboardingUrl: '/seller/onboard'
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to verify seller status' },
        { status: 500 }
      );
    }

    // Must have accepted terms for ANY listing type
    if (!profile?.seller_terms_accepted_at || profile?.seller_status !== 'active') {
      return NextResponse.json(
        {
          error: 'Please complete seller onboarding first',
          requiresOnboarding: true,
          onboardingUrl: '/seller/onboard'
        },
        { status: 403 }
      );
    }

    // For instant_buy listings, also require Stripe to be connected
    if (listingType === 'instant_buy' && !profile?.stripe_connect_payouts_enabled) {
      return NextResponse.json(
        {
          error: 'Payment setup required for instant buy listings',
          requiresStripe: true,
          upgradeUrl: '/seller/settings/payouts'
        },
        { status: 403 }
      );
    }


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
      // Auction-specific fields
      auctionStartPrice,
      auctionDurationDays,
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

    // For non-auction listings, price is required
    if (listingType !== 'auction' && (!price || parseFloat(price) <= 0)) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    // Auction-specific validation
    if (listingType === 'auction') {
      if (!auctionStartPrice || parseFloat(auctionStartPrice) <= 0) {
        return NextResponse.json(
          { error: 'Starting price is required for auctions' },
          { status: 400 }
        );
      }

      if (![1, 3, 5, 7].includes(auctionDurationDays)) {
        return NextResponse.json(
          { error: 'Auction duration must be 1, 3, 5, or 7 days' },
          { status: 400 }
        );
      }
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

      // Pricing (for auctions, use start price as the display price)
      price: listingType === 'auction' ? parseFloat(auctionStartPrice) : parseFloat(price),

      // Shipping - T2T only (terminal-to-terminal via Unisend)
      shipping_local_pickup: false,
      shipping_parcel_locker: true,
      shipping_notes: null,

      // Bundled expansions
      included_expansions: includedExpansions || [],

      // Metadata
      seller_id: sellerId,
      status: 'active',
      listing_type: listingType,

      // Auction-specific fields (only set for auction listings)
      ...(listingType === 'auction' ? {
        auction_start_price: parseFloat(auctionStartPrice),
        auction_duration_days: auctionDurationDays,
        auction_ends_at: new Date(Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000).toISOString(),
        auction_bid_count: 0,
        auction_anti_snipe_extended: false,
      } : {}),
    };

    // Ensure game metadata is populated (for listing cards display)
    await ensureGameMetadata(selectedGame.id);

    // Insert listing into database
    const { data: listing, error: insertError } = await (supabase as any)
      .from('listings')
      .insert(listingData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Failed to create listing',
          details: insertError.message,
        },
        { status: 500 }
      );
    }


    return NextResponse.json({
      listing,
      message: 'Listing created successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Create listing');
  }
}

/**
 * GET /api/listings
 *
 * Fetches listings with optional filtering and pagination:
 * - ?gameId=123 - Get listings for a specific game
 * - ?sellerId=xyz - Get listings by a specific seller
 * - ?status=active - Filter by status (default: active for public browse, all for seller's own listings)
 * - ?listingType=instant_buy|contact_seller - Filter by listing type
 * - ?page=1 - Page number (default: 1)
 * - ?limit=20 - Items per page (default: 20)
 *
 * Uses the listings_with_details view for optimized single-query fetching.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const listingType = searchParams.get('listingType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Calculate offset for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createServerSupabase();

    // Use the optimized view that joins listings + games + seller data in one query
    let query = (supabase as any)
      .from('listings_with_details')
      .select('*', { count: 'exact' })
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

    // Filter by listing type (instant_buy, contact_seller, or auction)
    if (listingType && ['instant_buy', 'contact_seller', 'auction'].includes(listingType)) {
      query = query.eq('listing_type', listingType);
    }

    const { data: rawListings, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch listings', details: error.message },
        { status: 500 }
      );
    }

    // Transform flat view data into nested structure expected by frontend
    const listings = (rawListings || []).map((row: any) => {
      // Check for version-specific images
      let thumbnail = row.game_thumbnail;
      let image = row.game_image;

      if (row.bgg_version_id && row.game_versions) {
        const versions = Array.isArray(row.game_versions) ? row.game_versions : [];
        const version = versions.find((v: any) => v.id === row.bgg_version_id);
        if (version) {
          thumbnail = version.thumbnail || thumbnail;
          image = version.image || image;
        }
      }

      return {
        // Listing core fields
        id: row.id,
        bgg_game_id: row.bgg_game_id,
        game_name: row.game_name,
        game_year: row.game_year,
        version_source: row.version_source,
        bgg_version_id: row.bgg_version_id,
        version_name: row.version_name,
        publisher: row.publisher,
        language: row.language,
        edition_year: row.edition_year,
        photo_urls: row.photo_urls,
        condition: row.condition,
        condition_notes: row.condition_notes,
        all_components_present: row.all_components_present,
        missing_components: row.missing_components,
        price: row.price,
        shipping_local_pickup: row.shipping_local_pickup,
        shipping_parcel_locker: row.shipping_parcel_locker,
        shipping_notes: row.shipping_notes,
        seller_id: row.seller_id,
        status: row.status,
        listing_type: row.listing_type || 'instant_buy', // Default for backwards compatibility
        reserved_by: row.reserved_by,
        reserved_until: row.reserved_until,
        included_expansions: row.included_expansions,
        created_at: row.created_at,
        updated_at: row.updated_at,

        // Auction-specific fields
        auction_start_price: row.auction_start_price,
        auction_current_bid: row.auction_current_bid,
        auction_bid_count: row.auction_bid_count,
        auction_ends_at: row.auction_ends_at,
        auction_duration_days: row.auction_duration_days,
        auction_winner_id: row.auction_winner_id,
        auction_payment_deadline: row.auction_payment_deadline,
        auction_anti_snipe_extended: row.auction_anti_snipe_extended,

        // Nested game object
        game: {
          thumbnail,
          image,
          player_count: row.game_player_count,
          min_age: row.game_min_age,
          playing_time: row.game_playing_time,
          is_expansion: row.game_is_expansion,
        },

        // Nested seller object
        seller: {
          id: row.seller_id,
          full_name: row.seller_name || 'Unknown Seller',
          email: '', // Not exposed for security
          avatar_url: row.seller_avatar_url,
          country: row.seller_country,
          total_reviews: row.seller_total_reviews ?? 0,
          average_rating: row.seller_average_rating ?? 0,
          total_completed_sales: row.seller_total_completed_sales ?? 0,
          member_since: row.seller_member_since,
        },
      };
    });

    const total = count || 0;
    const hasMore = (from + listings.length) < total;

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch listings');
  }
}
