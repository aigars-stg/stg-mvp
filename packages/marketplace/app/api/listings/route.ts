import { NextRequest, NextResponse } from 'next/server';
import { isManualVersion, type VersionSelection } from '@/lib/bgg-types';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { verifyTurnstile } from '@/lib/turnstile';
import { ensureGameMetadata } from '@/lib/bgg-api';
import { checkRateLimit, getRateLimitAction } from '@/lib/ratelimit';
import type { TransactionMethod, PricingFormat } from '@/lib/types/listing';
import type { ListingWithDetailsRow } from '@/lib/supabase/query-types';

interface GameVersion {
  id: number;
  thumbnail?: string | null;
  image?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();

    // New 2-dimensional model: transactionMethod + pricingFormat
    // Also support legacy listingType for backwards compatibility
    let transactionMethod: TransactionMethod;
    let pricingFormat: PricingFormat;

    if (body.transactionMethod && body.pricingFormat) {
      // New model
      transactionMethod = body.transactionMethod;
      pricingFormat = body.pricingFormat;
    } else if (body.listingType) {
      // Legacy model - convert to new format
      if (body.listingType === 'auction') {
        transactionMethod = 'contact_seller';
        pricingFormat = 'auction';
      } else if (body.listingType === 'instant_buy') {
        transactionMethod = 'instant_buy';
        pricingFormat = 'fixed_price';
      } else {
        transactionMethod = 'contact_seller';
        pricingFormat = 'fixed_price';
      }
    } else {
      // Default
      transactionMethod = 'contact_seller';
      pricingFormat = 'fixed_price';
    }

    // Validate transaction method
    if (!['contact_seller', 'instant_buy'].includes(transactionMethod)) {
      return NextResponse.json(
        { error: 'Invalid transaction method' },
        { status: 400 }
      );
    }

    // Validate pricing format
    if (!['fixed_price', 'auction'].includes(pricingFormat)) {
      return NextResponse.json(
        { error: 'Invalid pricing format' },
        { status: 400 }
      );
    }

    // Derive listing_type for backwards compatibility
    const listingType = pricingFormat === 'auction' ? 'auction' : transactionMethod;

    // Check if seller has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('seller_status, seller_terms_accepted_at')
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

    // Rate limit: 50/day for sellers, 2/day for buyers
    const isSeller = profile?.seller_status === 'active';
    const rateLimitResult = await checkRateLimit(getRateLimitAction('listingCreate', isSeller), user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error, reset: rateLimitResult.reset },
        { status: 429 }
      );
    }

    // For instant_buy, also require phone number (needed for Unisend shipping labels)
    if (transactionMethod === 'instant_buy') {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (!userProfile?.phone || userProfile.phone.trim() === '') {
        return NextResponse.json(
          {
            error: 'Phone number required for instant buy listings. Please add your phone number in your profile settings.',
            requiresPhone: true,
            settingsUrl: '/profile/settings'
          },
          { status: 403 }
        );
      }
    }

    // Verify Turnstile token (bot protection)
    const remoteIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const turnstileResult = await verifyTurnstile(body.turnstileToken, remoteIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
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
      price, // Used for both fixed price and auction starting bid
      includedExpansions, // Bundled expansions
      // Auction-specific fields
      auctionDurationDays,
      // Source wanted listing (for "I have this" flow)
      sourceWantedListingId,
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

    // Price is now required for ALL listings (fixed price or auction starting bid)
    if (!price || parseFloat(price) <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    // Auction-specific validation
    if (pricingFormat === 'auction') {
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

      // Pricing - price is now used for both fixed price and auction starting bid
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

      // New 2-dimensional model columns
      transaction_method: transactionMethod,
      pricing_format: pricingFormat,

      // Keep listing_type for backwards compatibility (derived from new columns)
      listing_type: listingType,

      // Auction-specific fields (only set for auction pricing format)
      ...(pricingFormat === 'auction' ? {
        auction_start_price: parseFloat(price), // price IS the starting bid for auctions
        auction_duration_days: auctionDurationDays,
        auction_ends_at: new Date(Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000).toISOString(),
        auction_bid_count: 0,
        auction_anti_snipe_extended: false,
      } : {}),

      // Source wanted listing (for "I have this" flow - enables buyer notification)
      ...(sourceWantedListingId ? { source_wanted_listing_id: sourceWantedListingId } : {}),
    };

    // Ensure game metadata is populated (for listing cards display)
    await ensureGameMetadata(selectedGame.id);

    // Insert listing into database
    const { data: listing, error: insertError } = await supabase
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

    // If this listing was created from "I have this" flow, notify the buyer
    if (sourceWantedListingId) {
      try {
        // Fetch the wanted listing to get buyer info
        const { data: wantedListing } = await supabase
          .from('wanted_listings')
          .select('buyer_id, game_name')
          .eq('id', sourceWantedListingId)
          .single();

        if (wantedListing?.buyer_id) {
          // Create notification for the buyer
          // Copy: "{Game Name} just got listed — matches your request. Act fast!"
          await supabase.rpc('create_notification', {
            p_user_id: wantedListing.buyer_id,
            p_type: 'wanted_match',
            p_title: `${wantedListing.game_name || selectedGame.name} just got listed`,
            p_body: 'Matches your request. Act fast!',
            p_data: {
              listing_id: listing.id,
              wanted_listing_id: sourceWantedListingId,
              game_name: wantedListing.game_name || selectedGame.name,
              bgg_game_id: selectedGame.id,
            },
          });
        }
      } catch (notificationError) {
        // Don't fail the listing creation if notification fails
        console.error('Failed to send wanted match notification:', notificationError);
      }
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
 * - ?listingType=instant_buy|contact_seller|auction - Filter by legacy listing type (backwards compat)
 * - ?transactionMethod=instant_buy|contact_seller - Filter by transaction method (new model)
 * - ?pricingFormat=fixed_price|auction - Filter by pricing format (new model)
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
    const transactionMethod = searchParams.get('transactionMethod');
    const pricingFormat = searchParams.get('pricingFormat');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Calculate offset for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createServerSupabase();

    // Use the optimized view that joins listings + games + seller data in one query
    let query = supabase
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

    // Filter by legacy listing type (backwards compat)
    if (listingType && ['instant_buy', 'contact_seller', 'auction'].includes(listingType)) {
      query = query.eq('listing_type', listingType);
    }

    // Filter by new transaction method
    if (transactionMethod && ['instant_buy', 'contact_seller'].includes(transactionMethod)) {
      query = query.eq('transaction_method', transactionMethod);
    }

    // Filter by pricing format
    if (pricingFormat && ['fixed_price', 'auction'].includes(pricingFormat)) {
      query = query.eq('pricing_format', pricingFormat);
    }

    const { data: rawListings, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch listings', details: error.message },
        { status: 500 }
      );
    }

    // Transform flat view data into nested structure expected by frontend
    const listings = (rawListings || []).map((row: ListingWithDetailsRow) => {
      // Check for version-specific images
      let thumbnail = row.game_thumbnail;
      let image = row.game_image;

      if (row.bgg_version_id && row.game_versions) {
        const versions = Array.isArray(row.game_versions) ? row.game_versions as unknown as GameVersion[] : [];
        const version = versions.find((v) => v.id === row.bgg_version_id);
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
        // New 2-dimensional model columns
        transaction_method: row.transaction_method || (row.listing_type === 'instant_buy' ? 'instant_buy' : 'contact_seller'),
        pricing_format: row.pricing_format || (row.listing_type === 'auction' ? 'auction' : 'fixed_price'),
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
