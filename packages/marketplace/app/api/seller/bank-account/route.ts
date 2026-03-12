import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { sellerIbanSchema } from '@/lib/validation/seller';

/**
 * GET /api/seller/bank-account
 *
 * Get seller's bank account info (IBAN + account holder name)
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { data: profile, error } = await supabase
      .from('seller_profiles')
      .select('payout_iban, payout_account_holder_name')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ hasAccount: false });
      }
      throw error;
    }

    return NextResponse.json({
      hasAccount: !!profile?.payout_iban,
      iban: profile?.payout_iban || null,
      accountHolderName: profile?.payout_account_holder_name || null,
    });
  } catch (error) {
    return handleApiError(error, 'Fetch bank account info');
  }
}

/**
 * POST /api/seller/bank-account
 *
 * Save IBAN and account holder name to seller profile
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const parsed = sellerIbanSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { iban: cleanIban, accountHolderName } = parsed.data;

    // Update seller profile with IBAN
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({
        payout_iban: cleanIban,
        payout_account_holder_name: accountHolderName.trim(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to save bank account:', updateError);
      return NextResponse.json(
        { error: 'Failed to save bank account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      iban: `****${cleanIban.slice(-4)}`,
    });
  } catch (error) {
    return handleApiError(error, 'Save bank account');
  }
}
