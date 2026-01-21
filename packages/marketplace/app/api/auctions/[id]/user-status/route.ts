import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/error-handler';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/auctions/[id]/user-status
 *
 * Get current user's bid status for this auction:
 * - Whether they have placed any bids
 * - Their highest bid amount
 * - Whether they are currently the high bidder
 *
 * Returns null values for unauthenticated users.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: listingId } = await params;
    const supabase = await createServerSupabase();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        has_bid: false,
        user_highest_bid: null,
        is_winning: false,
      });
    }

    // Get auction current bid for comparison
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('auction_current_bid, listing_type')
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

    // Get user's highest bid on this auction
    const { data: userBid, error: bidError } = await supabase
      .from('bids')
      .select('amount, is_winning')
      .eq('listing_id', listingId)
      .eq('bidder_id', user.id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bidError) {
      return handleApiError(bidError, 'Get user bid status');
    }

    const hasBid = !!userBid;
    const userHighestBid = userBid?.amount ?? null;
    const isWinning = userBid?.is_winning ?? false;

    return NextResponse.json({
      has_bid: hasBid,
      user_highest_bid: userHighestBid,
      is_winning: isWinning,
    });
  } catch (error) {
    return handleApiError(error, 'Get user auction status');
  }
}
