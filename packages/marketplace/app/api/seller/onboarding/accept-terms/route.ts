import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

const CURRENT_SELLER_TERMS_VERSION = '1.0';

export async function POST(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Server controls terms version — client value is ignored
    const termsVersion = CURRENT_SELLER_TERMS_VERSION;

    // Verify user has a country set (required for shipping/payment)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('country')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.country) {
      return NextResponse.json(
        { error: 'Please select your country before becoming a seller.' },
        { status: 400 }
      );
    }

    // Create or update seller_profiles with terms acceptance
    // Use upsert to create the seller profile if it doesn't exist
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .upsert({
        user_id: user.id,
        seller_terms_accepted_at: new Date().toISOString(),
        seller_terms_version: termsVersion,
        seller_status: 'active',
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to accept terms' },
        { status: 500 }
      );
    }

    // Create wallet for new seller (idempotent)
    await supabase
      .from('wallets')
      .upsert({ user_id: user.id, balance_cents: 0 }, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      message: 'Seller terms accepted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Accept terms');
  }
}
