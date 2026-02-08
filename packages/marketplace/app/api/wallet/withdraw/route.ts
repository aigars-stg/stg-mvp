import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { getWalletBalance } from '@/lib/services/wallet';
import { createWithdrawalRequest, getUserWithdrawals } from '@/lib/services/withdrawal';
import { withdrawalRequestSchema } from '@/lib/validation/seller';

/**
 * GET /api/wallet/withdraw
 * Returns the authenticated user's withdrawal history
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const { withdrawals, total } = await getUserWithdrawals(supabase, user.id, {
      limit,
      offset,
    });

    return NextResponse.json({ withdrawals, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Fetch withdrawals');
  }
}

/**
 * POST /api/wallet/withdraw
 * Create a new withdrawal request
 * Body: { amountCents, iban, accountHolderName }
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const parsed = withdrawalRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { amountCents, iban, accountHolderName } = parsed.data;

    // Verify sufficient balance
    const { balanceCents } = await getWalletBalance(supabase, user.id);
    if (balanceCents < amountCents) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    const result = await createWithdrawalRequest(
      supabase,
      user.id,
      amountCents,
      iban,
      accountHolderName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create withdrawal request' },
        { status: 500 }
      );
    }

    // Save IBAN to seller profile for future use
    await supabase
      .from('seller_profiles')
      .update({
        payout_iban: iban,
        payout_account_holder_name: accountHolderName,
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      withdrawalId: result.withdrawalId,
    });
  } catch (error) {
    return handleApiError(error, 'Create withdrawal');
  }
}
