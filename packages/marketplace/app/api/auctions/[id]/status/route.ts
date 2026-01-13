import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/error-handler';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/auctions/[id]/status
 *
 * Get current auction status including:
 * - Current highest bid
 * - Bid count
 * - End time (may have been extended by anti-snipe)
 * - Minimum bid required
 * - Whether auction has ended
 * - Winner ID if applicable
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: listingId } = await params;
    const supabase = await createServerSupabase();

    // Get auction status
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        auction_current_bid,
        auction_bid_count,
        auction_ends_at,
        auction_start_price,
        auction_winner_id,
        auction_payment_deadline,
        auction_anti_snipe_extended,
        status,
        listing_type
      `)
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

    // Calculate minimum bid
    const currentBid = listing.auction_current_bid;
    const startPrice = listing.auction_start_price;
    const minimumBid = currentBid && currentBid > 0
      ? currentBid + 1 // EUR 1.00 increment
      : startPrice;

    // Check if auction has ended
    const endsAt = listing.auction_ends_at ? new Date(listing.auction_ends_at) : null;
    const isEnded = endsAt ? endsAt <= new Date() : false;

    return NextResponse.json({
      listing_id: listing.id,
      current_bid: listing.auction_current_bid,
      bid_count: listing.auction_bid_count || 0,
      ends_at: listing.auction_ends_at,
      start_price: listing.auction_start_price,
      minimum_bid: minimumBid,
      is_ended: isEnded,
      winner_id: listing.auction_winner_id,
      payment_deadline: listing.auction_payment_deadline,
      was_extended: listing.auction_anti_snipe_extended,
      status: listing.status,
    });
  } catch (error) {
    return handleApiError(error, 'Get auction status');
  }
}
