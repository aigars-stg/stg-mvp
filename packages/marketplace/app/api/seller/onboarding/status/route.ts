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

    // With wallet-based payments, all sellers with accepted terms can list
    // All active sellers can create both listing types
    const canCreateContactSeller = termsAccepted && isActive;
    const canCreateInstantBuy = termsAccepted && isActive;

    // Onboarding is "completed" if seller can create listings
    const onboardingCompleted = termsAccepted && isActive;
    const canListItems = onboardingCompleted;

    // Construct response object
    const statusData = {
      seller_status: sellerProfile?.seller_status || 'not_started',
      terms_accepted: termsAccepted,
      onboarding_completed: onboardingCompleted,
      can_list_items: canListItems,
      can_create_contact_seller: canCreateContactSeller,
      can_create_instant_buy: canCreateInstantBuy,
      has_phone: hasPhone,
      has_payout_info: !!(sellerProfile?.payout_iban && sellerProfile?.payout_account_holder_name),
      needs_dac7_info: false,
    };

    return NextResponse.json(statusData);
  } catch (error) {
    return handleApiError(error, 'Check onboarding status');
  }
}
