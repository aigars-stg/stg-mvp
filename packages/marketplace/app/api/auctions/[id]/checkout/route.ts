import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getShippingPrice } from '@/lib/unisend';
import { createAuctionCheckoutSession } from '@/lib/services/checkout';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface Params {
  params: Promise<{ id: string }>;
}

interface AuctionCheckoutBody {
  shippingMethod: 't2t' | 'local_pickup';
  destinationCountry?: string;
  destinationTerminalId?: string;
  destinationTerminalName?: string;
  destinationTerminalAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverEmail?: string;
  pickupCity?: string;
  pickupNotes?: string;
  useWallet?: boolean;
}

/**
 * POST /api/auctions/[id]/checkout
 *
 * Create a payment session for an auction winner (EveryPay + wallet).
 * Only the winning bidder can access this endpoint.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id: listingId } = await params;
    const body: AuctionCheckoutBody = await request.json();

    const { shippingMethod } = body;

    // Validate shipping method
    if (!shippingMethod || !['t2t', 'local_pickup'].includes(shippingMethod)) {
      return NextResponse.json(
        { error: 'Valid shipping method is required' },
        { status: 400 }
      );
    }

    // Validate T2T required fields
    if (shippingMethod === 't2t') {
      if (!body.destinationCountry || !body.destinationTerminalId ||
          !body.destinationTerminalName || !body.receiverName ||
          !body.receiverPhone || !body.receiverEmail) {
        return NextResponse.json(
          { error: 'T2T shipping requires destination terminal and receiver contact info' },
          { status: 400 }
        );
      }
    }

    // Get listing and verify user is the auction winner
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        listing_type,
        auction_winner_id,
        auction_current_bid,
        auction_payment_deadline,
        game_name,
        seller_id,
        status,
        photo_urls,
        condition
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

    if (listing.auction_winner_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not the winner of this auction' },
        { status: 403 }
      );
    }

    if (!listing.auction_payment_deadline || new Date(listing.auction_payment_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'Payment deadline has expired' },
        { status: 400 }
      );
    }

    const winningBid = listing.auction_current_bid;
    if (!winningBid) {
      return NextResponse.json(
        { error: 'No winning bid found' },
        { status: 400 }
      );
    }

    // Use service role for wallet operations
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get seller country for route-based shipping pricing
    const { data: sellerProfile } = await adminSupabase
      .from('user_profiles')
      .select('country')
      .eq('id', listing.seller_id)
      .single();

    const sellerCountry = sellerProfile?.country;
    if (shippingMethod === 't2t' && (!sellerCountry || !['LV', 'LT', 'EE'].includes(sellerCountry))) {
      return NextResponse.json(
        { error: 'Seller country is required for shipping' },
        { status: 400 }
      );
    }

    if (shippingMethod === 't2t' && !body.destinationCountry) {
      return NextResponse.json(
        { error: 'Destination country required for T2T shipping' },
        { status: 400 }
      );
    }

    const shippingCostEuros = shippingMethod === 't2t'
      ? getShippingPrice(
          sellerCountry as 'LV' | 'LT' | 'EE',
          body.destinationCountry as 'LV' | 'LT' | 'EE',
          'M'
        )
      : 0;

    if (shippingCostEuros == null) {
      return NextResponse.json(
        { error: 'Shipping not available for this route' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const result = await createAuctionCheckoutSession(adminSupabase, {
      listingId,
      buyerId: user.id,
      sellerId: listing.seller_id,
      shippingMethod,
      winningBidEuros: winningBid,
      shippingCostEuros,
      gameName: listing.game_name,
      locale: request.headers.get('x-locale') || 'en',
      buyerEmail: body.receiverEmail || user.email,
      customerIp: request.headers.get('x-forwarded-for') || undefined,
      useWallet: body.useWallet ?? true,

      destinationCountry: body.destinationCountry,
      destinationTerminalId: body.destinationTerminalId,
      destinationTerminalName: body.destinationTerminalName,
      destinationTerminalAddress: body.destinationTerminalAddress,
      receiverName: body.receiverName,
      receiverPhone: body.receiverPhone,
      receiverEmail: body.receiverEmail,
      pickupCity: body.pickupCity,
      pickupNotes: body.pickupNotes,
    }, appUrl);

    switch (result.type) {
      case 'wallet_only':
        return NextResponse.json({
          redirect: result.redirect,
          orderId: result.orderId,
        });

      case 'everypay':
        return NextResponse.json({
          redirect: result.paymentLink,
          paymentReference: result.paymentReference,
        });

      case 'error':
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
    }
  } catch (error) {
    return handleApiError(error, 'Auction checkout');
  }
}
