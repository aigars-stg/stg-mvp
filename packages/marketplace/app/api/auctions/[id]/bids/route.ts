import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/error-handler';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/auctions/[id]/bids
 *
 * Get bid history for an auction with anonymized bidder info.
 * Bidders are shown as "A player from [City]" or "M*** from Vilnius"
 * to create a community feel while protecting privacy.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: listingId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = await createServerSupabase();

    // First verify this is an auction listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, listing_type')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (listing.listing_type !== 'auction') {
      return NextResponse.json(
        { error: 'This listing is not an auction' },
        { status: 400 }
      );
    }

    // Get bids with bidder profile info for anonymization
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        is_winning,
        triggered_extension,
        extension_minutes,
        created_at,
        bidder_id
      `)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bidsError) {
      console.error('Failed to fetch bids:', bidsError);
      return NextResponse.json(
        { error: 'Failed to fetch bid history' },
        { status: 500 }
      );
    }

    // Get bidder profiles for anonymization
    const bidderIds = [...new Set((bids || []).map(b => b.bidder_id))];

    let bidderProfiles: Record<string, { full_name: string; country: string | null }> = {};

    if (bidderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, country')
        .in('id', bidderIds);

      if (profiles) {
        bidderProfiles = profiles.reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, country: p.country };
          return acc;
        }, {} as Record<string, { full_name: string; country: string | null }>);
      }
    }

    // Anonymize bidder info with community-friendly display names
    const totalBids = bids?.length || 0;
    const anonymizedBids = (bids || []).map((bid, index) => {
      const profile = bidderProfiles[bid.bidder_id];
      const firstName = profile?.full_name?.split(' ')[0] || 'Player';
      const country = profile?.country;

      // Create friendly anonymized name
      let displayName: string;
      if (bid.is_winning) {
        displayName = country
          ? `${firstName.charAt(0)}*** from ${country}`
          : `${firstName.charAt(0)}***`;
      } else {
        // For non-winning bids, use position-based naming
        const position = totalBids - index;
        displayName = country
          ? `A player from ${country}`
          : `Bidder #${position}`;
      }

      return {
        id: bid.id,
        amount: bid.amount,
        is_winning: bid.is_winning,
        triggered_extension: bid.triggered_extension,
        extension_minutes: bid.extension_minutes,
        created_at: bid.created_at,
        bidder: {
          display_name: displayName,
          country: country,
        },
      };
    });

    return NextResponse.json({
      bids: anonymizedBids,
      total: totalBids,
    });
  } catch (error) {
    return handleApiError(error, 'Get bid history');
  }
}
