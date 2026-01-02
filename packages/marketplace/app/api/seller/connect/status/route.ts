import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { syncConnectAccountStatus } from '@/lib/stripe/connect-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/connect/status
 *
 * Get seller's Stripe Connect account status
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

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
  } catch (error) {
    return handleApiError(error, 'Check connect status');
  }
}
