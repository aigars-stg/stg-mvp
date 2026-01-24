import { NextRequest, NextResponse } from 'next/server';
import { stripe, calculateMarketplacePricing } from '@/lib/stripe';
import { getShippingPrice, type TerminalCountry } from '@/lib/unisend/types';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface Params {
  params: Promise<{ id: string }>;
}

interface AuctionCheckoutBody {
  shippingMethod: 't2t' | 'local_pickup';

  // For T2T shipping
  destinationCountry?: TerminalCountry;
  destinationTerminalId?: string;
  destinationTerminalName?: string;
  destinationTerminalAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverEmail?: string;

  // For local pickup
  pickupCity?: string;
  pickupNotes?: string;
}

/**
 * POST /api/auctions/[id]/checkout
 *
 * Create a Stripe Checkout session for an auction winner.
 * Only the winning bidder can access this endpoint.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id: listingId } = await params;
    const body: AuctionCheckoutBody = await request.json();

    const {
      shippingMethod,
      destinationCountry,
      destinationTerminalId,
      destinationTerminalName,
      receiverName,
      receiverPhone,
      receiverEmail,
    } = body;

    // Validate shipping method
    if (!shippingMethod || !['t2t', 'local_pickup'].includes(shippingMethod)) {
      return NextResponse.json(
        { error: 'Valid shipping method is required' },
        { status: 400 }
      );
    }

    // Validate T2T required fields
    if (shippingMethod === 't2t') {
      if (!destinationCountry || !destinationTerminalId || !destinationTerminalName ||
          !receiverName || !receiverPhone || !receiverEmail) {
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

    // Check payment deadline hasn't expired
    if (!listing.auction_payment_deadline || new Date(listing.auction_payment_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'Payment deadline has expired' },
        { status: 400 }
      );
    }

    // Get seller's Stripe Connect account and country
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('stripe_connect_account_id, stripe_connect_payouts_enabled')
      .eq('user_id', listing.seller_id)
      .single();

    if (sellerError || !sellerProfile?.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Seller payment account not configured' },
        { status: 400 }
      );
    }

    // Get seller's country for shipping calculation
    const { data: sellerUserProfile } = await supabase
      .from('user_profiles')
      .select('country')
      .eq('id', listing.seller_id)
      .single();

    const sellerCountry = (sellerUserProfile?.country as TerminalCountry) || 'LV';

    // Calculate shipping cost
    let shippingCostEuros = 0;
    if (shippingMethod === 't2t' && destinationCountry) {
      shippingCostEuros = getShippingPrice(sellerCountry, destinationCountry);
    }

    // Calculate pricing using the winning bid amount
    const winningBid = listing.auction_current_bid;
    if (!winningBid) {
      return NextResponse.json(
        { error: 'No winning bid found' },
        { status: 400 }
      );
    }
    const pricing = calculateMarketplacePricing(winningBid, shippingCostEuros, shippingMethod);

    // Get app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: receiverEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: listing.game_name,
              description: `Auction winner - ${listing.condition} condition`,
              images: listing.photo_urls?.length > 0
                ? [listing.photo_urls[0]]
                : undefined,
            },
            unit_amount: pricing.itemsTotalCents,
          },
          quantity: 1,
        },
        ...(shippingCostEuros > 0
          ? [
              {
                price_data: {
                  currency: 'eur',
                  product_data: {
                    name: 'Shipping (Terminal to Terminal)',
                    description: `Delivery to ${destinationTerminalName}`,
                  },
                  unit_amount: pricing.shippingCostCents,
                },
                quantity: 1,
              },
            ]
          : []),
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Service Fee',
              description: 'Second Turn marketplace fee',
            },
            unit_amount: pricing.serviceFeeCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: pricing.serviceFeeCents,
        transfer_data: {
          destination: sellerProfile.stripe_connect_account_id,
        },
        on_behalf_of: sellerProfile.stripe_connect_account_id,
        metadata: {
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          order_type: 'auction',
          winning_bid: winningBid.toString(),
          shipping_method: shippingMethod,
          destination_country: destinationCountry || '',
          destination_terminal_id: destinationTerminalId || '',
          destination_terminal_name: destinationTerminalName || '',
          receiver_name: receiverName || '',
          receiver_phone: receiverPhone || '',
          receiver_email: receiverEmail || '',
        },
      },
      metadata: {
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        order_type: 'auction',
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=auction`,
      cancel_url: `${appUrl}/games/${listing.id}?checkout_cancelled=true`,
    });

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    return handleApiError(error, 'Auction checkout');
  }
}
