import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get seller onboarding status directly from the table
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

    // Check if user has a phone number (needed for Unisend shipping labels)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    const hasPhone = !!(userProfile?.phone && userProfile.phone.trim() !== '');

    // Determine status based on profile data
    const termsAccepted = !!sellerProfile?.seller_terms_accepted_at;
    const isActive = sellerProfile?.seller_status === 'active';

    // Onboarding is "completed" if seller has accepted terms and is active
    const onboardingCompleted = termsAccepted && isActive;

    // Count listings created in the last 24 hours (for rate-limit warning banner — EC-15)
    const dailyLimit = isActive ? 50 : 2;
    const { count: listingsToday } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('status', 'removed');

    const statusData = {
      seller_status: sellerProfile?.seller_status || 'not_started',
      terms_accepted: termsAccepted,
      onboarding_completed: onboardingCompleted,
      can_list_items: onboardingCompleted,
      has_phone: hasPhone,
      has_payout_info: !!(sellerProfile?.payout_iban && sellerProfile?.payout_account_holder_name),
      listings_today: listingsToday ?? 0,
      daily_limit: dailyLimit,
    };

    return NextResponse.json(statusData);
  } catch (error) {
    return handleApiError(error, 'Check onboarding status');
  }
}
