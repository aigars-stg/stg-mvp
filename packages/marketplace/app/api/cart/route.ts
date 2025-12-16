import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/cart
 *
 * Get the current user's shopping cart
 * Returns baskets grouped by seller with items and timers
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to view your cart' },
        { status: 401 }
      );
    }

    // Get cart using the database function
    const { data: cart, error: cartError } = await (supabase as any).rpc('get_cart', {
      p_buyer_id: user.id,
    });

    if (cartError) {
      console.error('❌ [Cart] Error fetching cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to fetch cart', details: cartError.message },
        { status: 500 }
      );
    }

    // Calculate totals
    const baskets = cart || [];
    const totalItems = baskets.reduce(
      (sum: number, b: any) => sum + (b.item_count || 0),
      0
    );
    const totalAmount = baskets.reduce(
      (sum: number, b: any) => sum + (parseFloat(b.subtotal) || 0),
      0
    );

    return NextResponse.json({
      baskets,
      summary: {
        basketCount: baskets.length,
        totalItems,
        totalAmount,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    console.error('❌ [Cart] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 *
 * Add a listing to the cart
 * Body: { listingId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to add items to cart' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    console.log(`🛒 [Cart] User ${user.id} adding listing ${listingId}`);

    // Add to cart using the database function
    const { data: result, error: addError } = await (supabase as any).rpc('add_to_cart', {
      p_buyer_id: user.id,
      p_listing_id: listingId,
    });

    if (addError) {
      console.error('❌ [Cart] Error adding to cart:', addError);
      return NextResponse.json(
        { error: 'Failed to add to cart', details: addError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.log(`⚠️ [Cart] Add failed: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log(`✅ [Cart] Added listing ${listingId} to basket ${result.basket_id}`);

    return NextResponse.json({
      success: true,
      basketId: result.basket_id,
      itemId: result.item_id,
      expiresAt: result.expires_at,
      message: 'Item added to cart. Reserved for 30 minutes.',
    });
  } catch (error: any) {
    console.error('❌ [Cart] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to add to cart', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart
 *
 * Remove a listing from the cart
 * Query params: ?listingId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to modify your cart' },
        { status: 401 }
      );
    }

    console.log(`🛒 [Cart] User ${user.id} removing listing ${listingId}`);

    // Remove from cart using the database function
    const { data: result, error: removeError } = await (supabase as any).rpc(
      'remove_from_cart',
      {
        p_buyer_id: user.id,
        p_listing_id: listingId,
      }
    );

    if (removeError) {
      console.error('❌ [Cart] Error removing from cart:', removeError);
      return NextResponse.json(
        { error: 'Failed to remove from cart', details: removeError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log(`✅ [Cart] Removed listing ${listingId} from cart`);

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error: any) {
    console.error('❌ [Cart] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from cart', details: error.message },
      { status: 500 }
    );
  }
}
