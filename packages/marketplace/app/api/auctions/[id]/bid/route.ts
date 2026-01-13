import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { createServerSupabase } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/auctions/[id]/bid
 *
 * Place a bid on an auction listing.
 * Uses the place_bid() database function for validation and anti-snipe logic.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id: listingId } = await params;
    const body = await request.json();
    const { amount } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Valid bid amount is required' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               null;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Call the database function
    const { data, error } = await supabase.rpc('place_bid', {
      p_listing_id: listingId,
      p_bidder_id: user.id,
      p_amount: parseFloat(amount),
      p_ip_address: ip ?? undefined,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error('place_bid error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // The function returns a JSON object with success status
    if (!data.success) {
      return NextResponse.json(
        {
          error: data.error,
          minimum_bid: data.minimum_bid,
        },
        { status: 400 }
      );
    }

    // If there was a previous bidder, we could trigger outbid notification here
    // For now, the cron job or Edge Function will handle notifications
    const previousBidderId = data.previous_bidder_id;

    return NextResponse.json({
      success: true,
      bid_id: data.bid_id,
      amount: data.amount,
      new_end_time: data.new_end_time,
      was_extended: data.was_extended,
      extension_minutes: data.extension_minutes,
      previous_bidder_id: previousBidderId,
    });
  } catch (error) {
    return handleApiError(error, 'Place bid');
  }
}
