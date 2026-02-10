import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface ExtendResult {
  success: boolean;
  error?: string;
  extended_count?: number;
  new_expires_at?: string;
}

/**
 * POST /api/cart/extend
 *
 * Extend reservation timer for all items in a basket by 5 minutes.
 * Max 2 extensions per item (40 minutes total).
 * Body: { basketId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const { basketId } = body;

    if (!basketId) {
      return NextResponse.json({ error: 'Basket ID is required' }, { status: 400 });
    }

    const { data: result, error: extendError } = await supabase.rpc(
      'extend_cart_reservation',
      {
        p_buyer_id: user.id,
        p_basket_id: basketId,
      }
    );

    if (extendError) {
      return NextResponse.json(
        { error: 'Failed to extend reservation', details: extendError.message },
        { status: 500 }
      );
    }

    const extendResult = result as unknown as ExtendResult;
    if (!extendResult.success) {
      return NextResponse.json({ error: extendResult.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      extendedCount: extendResult.extended_count,
      newExpiresAt: extendResult.new_expires_at,
    });
  } catch (error) {
    return handleApiError(error, 'Extend reservation');
  }
}
