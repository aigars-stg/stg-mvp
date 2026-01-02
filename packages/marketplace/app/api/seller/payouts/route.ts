import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getSellerBankPayouts } from '@/lib/stripe/payout-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/payouts
 *
 * Get seller's bank payout history
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get payouts
    const { payouts, total } = await getSellerBankPayouts(user.id, limit, offset);

    return NextResponse.json({
      payouts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + payouts.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch payouts');
  }
}
