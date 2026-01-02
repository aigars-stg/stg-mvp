import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSellerBankPayouts } from '@/lib/stripe/payout-service';

/**
 * GET /api/seller/payouts
 *
 * Get seller's bank payout history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch payouts', details: message },
      { status: 500 }
    );
  }
}
