import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get seller onboarding status directly from the table to avoid RPC issues
    const { data: sellerProfile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found" (no row)
      return NextResponse.json(
        { error: 'Failed to fetch onboarding status' },
        { status: 500 }
      );
    }

    // Determine status based on profile data
    const termsAccepted = !!sellerProfile?.seller_terms_accepted_at;
    const stripeConnected = !!sellerProfile?.stripe_connect_payouts_enabled;

    // Check completion criteria (mirrors logic in 043_update_seller_functions_for_split.sql)
    const onboardingCompleted =
      sellerProfile?.seller_status === 'active' &&
      termsAccepted &&
      stripeConnected;

    // Construct response object
    const statusData = {
      seller_status: sellerProfile?.seller_status || 'not_started',
      terms_accepted: termsAccepted,
      stripe_connected: stripeConnected,
      onboarding_completed: onboardingCompleted,
      can_list_items: onboardingCompleted, // Currently same as onboarding completed
      needs_dac7_info: false // Default to false for now as this is a new seller
    };

    return NextResponse.json(statusData);
  } catch (error) {
    return handleApiError(error, 'Check onboarding status');
  }
}
