import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/earnings
 *
 * Get seller's earnings summary from wallet transactions and orders.
 * With the wallet model, earnings are tracked via wallet_transactions.
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_cents')
      .eq('user_id', user.id)
      .single();

    // Get completed sales from wallet_transactions (sale_credit type)
    const { data: saleTransactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('amount_cents, created_at')
      .eq('user_id', user.id)
      .eq('type', 'sale_credit');

    if (txError) {
      throw new Error('Failed to fetch earnings data');
    }

    // Get completed withdrawal totals
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('amount_cents, status')
      .eq('user_id', user.id);

    // Calculate aggregates
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalSalesCount = 0;
    let totalEarningsCents = 0;
    let salesLast30Days = 0;
    let earningsLast30DaysCents = 0;

    if (saleTransactions) {
      for (const tx of saleTransactions) {
        totalSalesCount++;
        totalEarningsCents += tx.amount_cents;

        const txDate = new Date(tx.created_at as string);
        if (txDate >= thirtyDaysAgo) {
          salesLast30Days++;
          earningsLast30DaysCents += tx.amount_cents;
        }
      }
    }

    let completedWithdrawals = 0;
    let pendingWithdrawals = 0;
    let totalWithdrawnCents = 0;

    if (withdrawals) {
      for (const w of withdrawals) {
        if (w.status === 'completed') {
          completedWithdrawals++;
          totalWithdrawnCents += w.amount_cents;
        } else if (w.status === 'pending' || w.status === 'processing') {
          pendingWithdrawals++;
        }
      }
    }

    return NextResponse.json({
      totalSalesCount,
      totalEarnings: totalEarningsCents / 100,
      totalWithdrawn: totalWithdrawnCents / 100,
      walletBalance: (wallet?.balance_cents || 0) / 100,
      completedWithdrawals,
      pendingWithdrawals,
      salesLast30Days,
      earningsLast30Days: earningsLast30DaysCents / 100,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch earnings');
  }
}
