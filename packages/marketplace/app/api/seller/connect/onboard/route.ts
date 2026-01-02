import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createConnectAccount, createOnboardingLink } from '@/lib/stripe/connect-service';

/**
 * POST /api/seller/connect/onboard
 *
 * Create or retrieve Stripe Connect onboarding link for seller
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


    // Get user profile (core user data)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email, country, full_name, phone')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get seller profile (Stripe account info)
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('stripe_connect_account_id')
      .eq('user_id', user.id)
      .single();

    let onboardingUrl: string;

    if (sellerProfile?.stripe_connect_account_id) {
      // Account exists, create new onboarding link
      onboardingUrl = await createOnboardingLink(
        sellerProfile.stripe_connect_account_id,
        {
          fullName: profile.full_name,
          phone: profile.phone || undefined,
        }
      );
    } else {
      // Create new account and onboarding link
      const result = await createConnectAccount(
        user.id,
        profile.email,
        profile.country || 'LT',
        {
          fullName: profile.full_name,
          phone: profile.phone || undefined,
        }
      );
      onboardingUrl = result.onboardingUrl;
    }

    return NextResponse.json({
      success: true,
      onboardingUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create onboarding link', details: message },
      { status: 500 }
    );
  }
}
