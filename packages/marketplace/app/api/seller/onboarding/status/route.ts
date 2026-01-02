import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
