import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getConnectAccountDetails } from '@/lib/stripe/connect-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/stripe-status
 *
 * Get Stripe Connect account status and any pending requirements
 * Used to show warnings when seller needs to provide additional info
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get seller profile with Connect info
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripe_connect_account_id')
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
        requiresAction: false,
        currentlyDue: [],
        pastDue: [],
      });
    }

    // Fetch account details from Stripe
    const accountDetails = await getConnectAccountDetails(profile.stripe_connect_account_id);

    return NextResponse.json({
      hasAccount: true,
      requiresAction: accountDetails.requiresAction,
      currentlyDue: accountDetails.currentlyDue,
      pastDue: accountDetails.pastDue,
      chargesEnabled: accountDetails.chargesEnabled,
      payoutsEnabled: accountDetails.payoutsEnabled,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch Stripe status');
  }
}
