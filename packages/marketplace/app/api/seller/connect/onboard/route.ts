import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createConnectAccount, createOnboardingLink } from '@/lib/stripe/connect-service';

/**
 * POST /api/seller/connect/onboard
 *
 * Create or retrieve Stripe Connect onboarding link for seller
 */
export async function POST(request: NextRequest) {
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

    console.log(`💳 [Connect] Creating onboarding for user ${user.id}`);

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
      console.log(`💳 [Connect] Account exists: ${sellerProfile.stripe_connect_account_id}`);
      onboardingUrl = await createOnboardingLink(
        sellerProfile.stripe_connect_account_id,
        {
          fullName: profile.full_name,
          phone: profile.phone || undefined,
        }
      );
    } else {
      // Create new account and onboarding link
      console.log(`💳 [Connect] Creating new account`);
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
  } catch (error: any) {
    console.error('❌ [Connect] Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to create onboarding link', details: error.message },
      { status: 500 }
    );
  }
}
