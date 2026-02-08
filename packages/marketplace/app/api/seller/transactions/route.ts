import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface Transaction {
  id: string;
  type: 'sale_credit' | 'purchase_debit' | 'withdrawal' | 'refund_credit';
  amountCents: number;
  balanceAfterCents: number;
  description: string | null;
  orderId: string | null;
  withdrawalId: string | null;
  createdAt: string | null;
}

/**
 * GET /api/seller/transactions
 *
 * Get seller's wallet transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'all';

    // Query wallet_transactions
    let query = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by type if specified
    if (type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: walletTxns, error, count } = await query;

    if (error) {
      console.error('Failed to fetch wallet transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    const transactions: Transaction[] = (walletTxns || []).map((txn) => ({
      id: txn.id,
      type: txn.type as Transaction['type'],
      amountCents: txn.amount_cents,
      balanceAfterCents: txn.balance_after_cents,
      description: txn.description,
      orderId: txn.order_id,
      withdrawalId: txn.withdrawal_id,
      createdAt: txn.created_at,
    }));

    const totalCount = count || 0;

    return NextResponse.json({
      transactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + transactions.length < totalCount,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch transactions');
  }
}
