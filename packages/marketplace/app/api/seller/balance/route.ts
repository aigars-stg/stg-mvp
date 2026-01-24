import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getSellerBalance } from '@/lib/stripe/balance-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/balance
 *
 * Get seller's Stripe balance (available, pending, total)
 * Returns cached data if fresh (within 60 seconds)
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get seller profile with Connect info
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripe_connect_account_id, stripe_connect_payouts_enabled, has_bank_account')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if seller has Connect account
    if (!profile.stripe_connect_account_id) {
      return NextResponse.json({
        hasAccount: false,
        balance: null,
        message: 'No Stripe Connect account. Complete seller onboarding to view balance.',
      });
    }

    // Check if payouts are enabled
    if (!profile.stripe_connect_payouts_enabled) {
      return NextResponse.json({
        hasAccount: true,
        payoutsEnabled: false,
        balance: null,
        message: 'Complete Stripe onboarding to enable payouts and view balance.',
      });
    }

    // Fetch balance from Stripe (with caching)
    const balance = await getSellerBalance(user.id, profile.stripe_connect_account_id);

    return NextResponse.json({
      hasAccount: true,
      payoutsEnabled: true,
      hasBankAccount: profile.has_bank_account || false,
      balance: {
        available: balance.available,
        pending: balance.pending,
        total: balance.total,
      },
      cachedAt: balance.cachedAt,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch balance');
  }
}
