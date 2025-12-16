import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "Review not found" (no row)
      console.error('Error fetching onboarding status:', profileError);
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
    console.error('Onboarding status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
