import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createDashboardLink } from '@/lib/stripe/connect-service';

/**
 * POST /api/seller/connect/dashboard
 *
 * Get Stripe Express dashboard login link for seller
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create dashboard link', details: message },
      { status: 500 }
    );
  }
}
