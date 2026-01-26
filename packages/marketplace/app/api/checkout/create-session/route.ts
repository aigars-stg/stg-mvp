import { NextRequest, NextResponse } from 'next/server';
import { stripe, calculateMarketplacePricing } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js'; // For service role
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';
import type { TerminalCountry } from '@/lib/unisend/types';
import type Stripe from 'stripe';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface CreateSessionBody {
  basketId: string;
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

interface CartBasket {
  basket_id: string;
  seller_id: string;
  seller_name: string;
  seller_country: string | null;
  items: {
    item_id: string;
    listing_id: string;
    bgg_game_id: number;
    game_name: string;
    price: number;
    photo_url: string | null;
    condition: string;
    expires_at: string;
    is_expired: boolean;
  }[];
  item_count: number;
  subtotal: number;
}

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for a basket
 * Body: CreateSessionBody
 * Returns: { url: string } - Stripe Checkout session URL to redirect to
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    // Parse request body
    const body: CreateSessionBody = await request.json();
    const {
      basketId,
      shippingMethod,
      destinationCountry,
      destinationTerminalId,
      destinationTerminalName,
      destinationTerminalAddress,
      receiverName,
      receiverPhone,
      receiverEmail,
      pickupCity,
      pickupNotes,
    } = body;

    // Validate required fields
    if (!basketId || !shippingMethod) {
      return NextResponse.json(
        { error: 'Basket ID and shipping method are required' },
        { status: 400 }
      );
    }

    // Validate T2T required fields
    if (shippingMethod === 't2t') {
      if (
        !destinationCountry ||
        !destinationTerminalId ||
        !destinationTerminalName ||
        !receiverName ||
        !receiverPhone ||
        !receiverEmail
      ) {
        return NextResponse.json(
          { error: 'T2T shipping requires destination terminal and receiver contact info' },
          { status: 400 }
        );
      }
    }

    // Validate local pickup required fields
    if (shippingMethod === 'local_pickup' && !pickupCity) {
      return NextResponse.json(
        { error: 'Local pickup requires pickup city' },
        { status: 400 }
      );
    }


    // Fetch cart to get basket
    const cartResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cart`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!cartResponse.ok) {
      throw new Error('Failed to fetch cart');
    }

    const cartData = await cartResponse.json();
    const basket: CartBasket | undefined = cartData.baskets?.find(
      (b: CartBasket) => b.basket_id === basketId
    );

    if (!basket) {
      return NextResponse.json(
        { error: 'Basket not found' },
        { status: 404 }
      );
    }

    // Check for expired items
    const hasExpiredItems = basket.items.some((item) => item.is_expired);
    if (hasExpiredItems) {
      return NextResponse.json(
        { error: 'Some items in your basket have expired. Please return to cart.' },
        { status: 400 }
      );
    }

    // Calculate shipping cost - flat €2.00 for Latvia preview
    const sellerCountry = (basket.seller_country || 'LV') as TerminalCountry;
    const shippingCostEuros = shippingMethod === 't2t' ? SHIPPING_COST_EUROS : 0;

    // Calculate pricing with service fees
    const pricing = calculateMarketplacePricing(
      basket.subtotal,
      shippingCostEuros,
      shippingMethod
    );


    // Create Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add each game as a line item
    basket.items.forEach((item) => {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.game_name,
            description: `Condition: ${item.condition}`,
            images: item.photo_url ? [item.photo_url] : undefined,
            metadata: {
              listing_id: item.listing_id,
              bgg_game_id: item.bgg_game_id.toString(),
            },
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
          tax_behavior: 'inclusive', // VAT included in listing price
        },
        quantity: 1,
      });
    });

    // Add shipping as line item if T2T
    if (shippingMethod === 't2t' && pricing.shippingCostCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Shipping (Unisend Terminal-to-Terminal)',
            description: `From ${sellerCountry} to ${destinationCountry}`,
          },
          unit_amount: pricing.shippingCostCents,
          tax_behavior: 'inclusive', // VAT included in shipping
        },
        quantity: 1,
      });
    }

    // Add service fee as line item
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Service Fee',
          description: 'Second Turn platform fee',
        },
        unit_amount: pricing.serviceFeeCents,
        tax_behavior: 'inclusive', // VAT included in service fee
      },
      quantity: 1,
    });

    // Fetch seller's Stripe Connect account ID
    // Use service role client to bypass RLS (buyer cannot read seller's stripe id)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sellerProfile, error: sellerError } = await adminSupabase
      .from('seller_profiles')
      .select('stripe_connect_account_id, stripe_connect_charges_enabled')
      .eq('user_id', basket.seller_id)
      .single();

    if (sellerError || !sellerProfile?.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Seller is not setup to receive payments' },
        { status: 400 }
      );
    }

    if (!sellerProfile.stripe_connect_charges_enabled) {
      return NextResponse.json(
        { error: 'Seller account is restricted' },
        { status: 400 }
      );
    }

    const sellerStripeId = sellerProfile.stripe_connect_account_id;

    // Create Stripe Checkout session
    // USING SEPARATE CHARGES WITH DELAYED TRANSFERS
    // - Platform is the Merchant of Record (Second Turn Games on statement)
    // - Platform holds funds until delivery confirmed + dispute window
    // - Enables full refunds and dispute handling
    // - Transfer to seller uses source_transaction to prevent failures
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      automatic_tax: { enabled: true }, // Enable Stripe Tax (Latvia 21% VAT, inclusive)
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?basket=${basketId}`,
      customer_email: receiverEmail || user.email,
      metadata: {
        basket_id: basketId,
        buyer_id: user.id,
        seller_id: basket.seller_id,
        seller_stripe_id: sellerStripeId, // Stored for payout service
        shipping_method: shippingMethod,

        // T2T metadata
        ...(shippingMethod === 't2t' && {
          destination_country: destinationCountry,
          destination_terminal_id: destinationTerminalId,
          destination_terminal_name: destinationTerminalName,
          destination_terminal_address: destinationTerminalAddress || '',
          sender_country: sellerCountry,
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          receiver_email: receiverEmail,
        }),

        // Local pickup metadata
        ...(shippingMethod === 'local_pickup' && {
          pickup_city: pickupCity,
          pickup_notes: pickupNotes || '',
        }),

        // Pricing metadata (in cents for precision)
        items_total_cents: pricing.itemsTotalCents.toString(),
        shipping_cost_cents: pricing.shippingCostCents.toString(),
        service_fee_cents: pricing.serviceFeeCents.toString(),
        total_charge_cents: pricing.totalChargeCents.toString(),
      },
      payment_intent_data: {
        // transfer_group links this charge to future transfers
        transfer_group: `BASKET_${basketId}`,
        metadata: {
          basket_id: basketId,
          buyer_id: user.id,
          seller_id: basket.seller_id,
          seller_stripe_id: sellerStripeId,
        },
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    return handleApiError(error, 'Create checkout session');
  }
}
