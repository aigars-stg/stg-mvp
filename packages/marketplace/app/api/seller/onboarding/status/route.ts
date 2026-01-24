import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export async function GET(_request: NextRequest) {
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
    const isActive = sellerProfile?.seller_status === 'active';

    // Dual-listing model capabilities:
    // - Contact Seller: Only requires terms accepted + active status
    // - Instant Buy: Also requires Stripe connected
    const canCreateContactSeller = termsAccepted && isActive;
    const canCreateInstantBuy = termsAccepted && isActive && stripeConnected;

    // Onboarding is "completed" if seller can create at least one type of listing
    // (either contact_seller via terms-only, or instant_buy via full Stripe setup)
    const onboardingCompleted = canCreateContactSeller || canCreateInstantBuy;

    // Can list items if either capability is available
    const canListItems = canCreateContactSeller || canCreateInstantBuy;

    // Construct response object
    const statusData = {
      seller_status: sellerProfile?.seller_status || 'not_started',
      terms_accepted: termsAccepted,
      stripe_connected: stripeConnected,
      onboarding_completed: onboardingCompleted,
      can_list_items: canListItems,
      // Dual-listing model capabilities
      can_create_contact_seller: canCreateContactSeller,
      can_create_instant_buy: canCreateInstantBuy,
      needs_dac7_info: false // Default to false for now as this is a new seller
    };

    return NextResponse.json(statusData);
  } catch (error) {
    return handleApiError(error, 'Check onboarding status');
  }
}
