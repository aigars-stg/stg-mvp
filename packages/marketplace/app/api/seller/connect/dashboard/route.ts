import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createDashboardLink } from '@/lib/stripe/connect-service';

/**
 * POST /api/seller/connect/dashboard
 *
 * Get Stripe Express dashboard login link for seller
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
  } catch (error: any) {
    console.error('❌ [Connect] Dashboard link error:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard link', details: error.message },
      { status: 500 }
    );
  }
}
