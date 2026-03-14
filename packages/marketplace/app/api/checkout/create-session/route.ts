import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getShippingPrice } from '@/lib/unisend';
import { checkoutSessionSchema } from '@/lib/validation/checkout';
import { createCheckoutSession } from '@/lib/services/checkout';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { checkRateLimit } from '@/lib/ratelimit';

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
 * Creates a payment session for a basket (EveryPay + wallet).
 * Returns either a redirect URL (EveryPay) or a success URL (wallet-only).
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    // Rate limit: 5 checkouts per hour
    const rateLimitResult = await checkRateLimit('checkout', user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error, reset: rateLimitResult.reset },
        { status: 429 }
      );
    }

    // Validate input with Zod
    const body = await request.json();
    const parsed = checkoutSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Fetch cart to get basket
    // Use VERCEL_URL for internal self-fetches to bypass Cloudflare proxy
    const internalOrigin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL;
    const cartResponse = await fetch(`${internalOrigin}/api/cart`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!cartResponse.ok) {
      throw new Error('Failed to fetch cart');
    }

    const cartData = await cartResponse.json();
    const basket: CartBasket | undefined = cartData.baskets?.find(
      (b: CartBasket) => b.basket_id === input.basketId
    );

    if (!basket) {
      return NextResponse.json(
        { error: 'Basket not found' },
        { status: 404 }
      );
    }

    // Check for expired items
    if (basket.items.some((item) => item.is_expired)) {
      return NextResponse.json(
        { error: 'Some items in your basket have expired. Please return to cart.' },
        { status: 400 }
      );
    }

    // Verify listing availability and prices haven't changed (audit 3.1)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const listingIds = basket.items.map((item) => item.listing_id);
    const { data: listings, error: listingsError } = await adminSupabase
      .from('listings')
      .select('id, status, price')
      .in('id', listingIds);

    if (listingsError || !listings) {
      return NextResponse.json(
        { error: 'Failed to verify listing availability' },
        { status: 500 }
      );
    }

    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const staleItems = basket.items.filter((item) => {
      const listing = listingMap.get(item.listing_id);
      return !listing || listing.status !== 'active' || listing.price !== item.price;
    });

    if (staleItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Some items have changed since you started checkout. Please return to cart.',
          staleItems: true,
        },
        { status: 409 }
      );
    }

    const { data: sellerProfile } = await adminSupabase
      .from('seller_profiles')
      .select('seller_status')
      .eq('user_id', basket.seller_id)
      .single();

    if (!sellerProfile || sellerProfile.seller_status !== 'active') {
      return NextResponse.json(
        { error: 'Seller is not set up to receive payments' },
        { status: 400 }
      );
    }

    // Calculate shipping
    const sellerCountry = basket.seller_country;
    if (!sellerCountry || !['LV', 'LT', 'EE'].includes(sellerCountry)) {
      return NextResponse.json(
        { error: 'Seller country is required for shipping' },
        { status: 400 }
      );
    }

    if (input.shippingMethod === 't2t' && !input.destinationCountry) {
      return NextResponse.json(
        { error: 'Destination country required for T2T shipping' },
        { status: 400 }
      );
    }

    const shippingCostEuros = input.shippingMethod === 't2t'
      ? getShippingPrice(
          sellerCountry as 'LV' | 'LT' | 'EE',
          input.destinationCountry as 'LV' | 'LT' | 'EE',
        )
      : 0;

    if (shippingCostEuros == null) {
      return NextResponse.json(
        { error: 'Shipping not available for this route' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    // Create checkout session via service
    const result = await createCheckoutSession(adminSupabase, {
      basketId: input.basketId,
      buyerId: user.id,
      sellerId: basket.seller_id,
      shippingMethod: input.shippingMethod,
      itemsTotalEuros: basket.subtotal,
      shippingCostEuros,
      locale: request.headers.get('x-locale') || 'en',
      buyerEmail: input.receiverEmail || user.email,
      customerIp: request.headers.get('x-forwarded-for') || undefined,
      useWallet: input.useWallet,

      // T2T fields
      destinationCountry: input.destinationCountry,
      destinationTerminalId: input.destinationTerminalId,
      destinationTerminalName: input.destinationTerminalName,
      destinationTerminalAddress: input.destinationTerminalAddress,
      senderCountry: sellerCountry,
      receiverName: input.receiverName,
      receiverPhone: input.receiverPhone,
      receiverEmail: input.receiverEmail,
    }, appUrl);

    // Return based on result type
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
    return handleApiError(error, 'Create checkout session');
  }
}
