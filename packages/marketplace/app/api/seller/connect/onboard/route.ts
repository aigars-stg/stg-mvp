import { NextRequest, NextResponse } from 'next/server';
import { createConnectAccount, createOnboardingLink } from '@/lib/stripe/connect-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/seller/connect/onboard
 *
 * Create or retrieve Stripe Connect onboarding link for seller
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

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
  } catch (error) {
    return handleApiError(error, 'Create onboarding link');
  }
}
