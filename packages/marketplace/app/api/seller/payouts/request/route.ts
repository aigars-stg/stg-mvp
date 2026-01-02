import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requestBankPayout } from '@/lib/stripe/payout-service';
import { clearBalanceCache } from '@/lib/stripe/balance-service';

/**
 * POST /api/seller/payouts/request
 *
 * Request a bank payout from seller's Stripe balance to their bank account
 */
export async function POST(request: NextRequest) {
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

    // Parse request body (optional amount)
    let amountInCents: number | undefined;
    try {
      const body = await request.json();
      if (body.amount && typeof body.amount === 'number') {
        amountInCents = Math.round(body.amount); // Assume already in cents
      }
    } catch {
      // No body or invalid JSON - that's fine, we'll use full balance
    }

    // Request payout
    const result = await requestBankPayout(user.id, amountInCents);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Clear balance cache so next fetch gets fresh data
    clearBalanceCache(user.id);

    return NextResponse.json({
      success: true,
      payout: {
        id: result.payoutId,
        amount: result.amount, // In cents
        amountFormatted: `€${((result.amount || 0) / 100).toFixed(2)}`,
        arrivalDate: result.arrivalDate,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to request payout', details: message },
      { status: 500 }
    );
  }
}
