import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/seller/onboarding/complete-terms-only
 *
 * Completes seller onboarding without Stripe, enabling Contact Seller listings only.
 * This allows sellers to list items for messaging-based sales without payment processing.
 *
 * Requirements:
 * - User must be authenticated
 * - User must have already accepted seller terms
 *
 * Result:
 * - Sets seller_status to 'active'
 * - Seller can create 'contact_seller' listings but not 'instant_buy' listings
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get current seller profile
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('seller_terms_accepted_at, seller_status')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // No seller profile exists yet
        return NextResponse.json(
          {
            error: 'Please accept seller terms first',
            requiresTerms: true,
            onboardingUrl: '/seller/onboard'
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch seller profile' },
        { status: 500 }
      );
    }

    // Verify terms have been accepted
    if (!profile?.seller_terms_accepted_at) {
      return NextResponse.json(
        {
          error: 'Please accept seller terms first',
          requiresTerms: true,
          onboardingUrl: '/seller/onboard'
        },
        { status: 400 }
      );
    }

    // Check if already active
    if (profile.seller_status === 'active') {
      return NextResponse.json({
        success: true,
        message: 'Seller account is already active',
        alreadyActive: true,
      });
    }

    // Activate the seller for Contact Seller listings
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({
        seller_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to activate seller account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Seller account activated for Contact Seller listings',
      canCreateContactSeller: true,
      canCreateInstantBuy: false,
    });
  } catch (error) {
    return handleApiError(error, 'Complete terms-only onboarding');
  }
}
