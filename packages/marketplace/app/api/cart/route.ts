import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/cart
 *
 * Get the current user's shopping cart
 * Returns baskets grouped by seller with items and timers
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get cart using the database function
    const { data: cart, error: cartError } = await (supabase as any).rpc('get_cart', {
      p_buyer_id: user.id,
    });

    if (cartError) {
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
  } catch (error) {
    return handleApiError(error, 'Fetch cart');
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
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    // Check if listing is contact_seller type (cannot be added to cart)
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('listing_type')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.listing_type === 'contact_seller') {
      return NextResponse.json(
        { error: 'Contact Seller listings cannot be added to cart. Please message the seller directly.' },
        { status: 400 }
      );
    }

    // Add to cart using the database function
    const { data: result, error: addError } = await (supabase as any).rpc('add_to_cart', {
      p_buyer_id: user.id,
      p_listing_id: listingId,
    });

    if (addError) {
      return NextResponse.json(
        { error: 'Failed to add to cart', details: addError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      basketId: result.basket_id,
      itemId: result.item_id,
      expiresAt: result.expires_at,
      message: 'Item added to cart. Reserved for 30 minutes.',
    });
  } catch (error) {
    return handleApiError(error, 'Add to cart');
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
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    // Remove from cart using the database function
    const { data: result, error: removeError } = await (supabase as any).rpc(
      'remove_from_cart',
      {
        p_buyer_id: user.id,
        p_listing_id: listingId,
      }
    );

    if (removeError) {
      return NextResponse.json(
        { error: 'Failed to remove from cart', details: removeError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    return handleApiError(error, 'Remove from cart');
  }
}
