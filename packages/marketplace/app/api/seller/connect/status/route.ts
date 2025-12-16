import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncConnectAccountStatus } from '@/lib/stripe/connect-service';

/**
 * GET /api/seller/connect/status
 *
 * Get seller's Stripe Connect account status
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
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select(`
        stripe_connect_account_id,
        stripe_connect_onboarding_completed,
        stripe_connect_charges_enabled,
        stripe_connect_payouts_enabled,
        stripe_connect_details_submitted
      `)
      .eq('user_id', user.id)
      .single();

    // If no seller profile or no account, return not set up
    if (!sellerProfile?.stripe_connect_account_id) {
      return NextResponse.json({
        hasAccount: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    // Account exists, sync latest status from Stripe
    const status = await syncConnectAccountStatus(
      user.id,
      sellerProfile.stripe_connect_account_id
    );

    return NextResponse.json({
      hasAccount: true,
      accountId: sellerProfile.stripe_connect_account_id,
      ...status,
    });
  } catch (error: any) {
    console.error('❌ [Connect] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    );
  }
}
