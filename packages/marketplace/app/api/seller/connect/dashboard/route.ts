import { NextRequest, NextResponse } from 'next/server';
import { createDashboardLink } from '@/lib/stripe/connect-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/seller/connect/dashboard
 *
 * Get Stripe Express dashboard login link for seller
 */
export async function POST(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get Connect account ID from seller_profiles
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripe_connect_account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'No Connect account found. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    // Create dashboard login link
    const dashboardUrl = await createDashboardLink(profile.stripe_connect_account_id);

    return NextResponse.json({
      success: true,
      dashboardUrl,
    });
  } catch (error) {
    return handleApiError(error, 'Create dashboard link');
  }
}
