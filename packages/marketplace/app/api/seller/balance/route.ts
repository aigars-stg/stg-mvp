import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSellerBalance } from '@/lib/stripe/balance-service';

/**
 * GET /api/seller/balance
 *
 * Get seller's Stripe balance (available, pending, total)
 * Returns cached data if fresh (within 60 seconds)
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
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }

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
  } catch (error: any) {
    console.error('❌ [Balance API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance', details: error.message },
      { status: 500 }
    );
  }
}
