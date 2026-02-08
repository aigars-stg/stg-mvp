import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { getWalletBalance } from '@/lib/services/wallet';

/**
 * GET /api/wallet/balance
 * Returns the authenticated user's wallet balance
 */
export async function GET() {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { balanceCents } = await getWalletBalance(supabase, user.id);

    return NextResponse.json({
      balanceCents,
      balanceEuros: balanceCents / 100,
    });
  } catch (error) {
    return handleApiError(error, 'Fetch wallet balance');
  }
}
