import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { getWalletTransactions } from '@/lib/services/wallet';

/**
 * GET /api/wallet/transactions
 * Returns the authenticated user's wallet transaction history
 * Query params: limit (default 20), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const { transactions, total } = await getWalletTransactions(supabase, user.id, {
      limit,
      offset,
    });

    return NextResponse.json({ transactions, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Fetch wallet transactions');
  }
}
