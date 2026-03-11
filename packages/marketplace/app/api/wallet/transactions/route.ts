import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { getWalletTransactions } from '@/lib/services/wallet';

/**
 * GET /api/wallet/transactions
 * Returns the authenticated user's wallet transaction history, enriched with
 * order metadata (order_number, first listing title) and withdrawal status.
 * Query params: limit (default 20), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 1000);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const { transactions, total } = await getWalletTransactions(supabase, user.id, {
      limit,
      offset,
      dateFrom,
      dateTo,
    });

    // Collect unique IDs to batch-fetch metadata
    const orderIds = [...new Set(transactions.map((t) => t.orderId).filter(Boolean) as string[])];
    const withdrawalIds = [...new Set(transactions.map((t) => t.withdrawalId).filter(Boolean) as string[])];

    // Batch-fetch order numbers and listing titles as separate queries
    // (combined multi-level join silently returns null on PostgREST schema cache failures)
    const orderMeta = new Map<string, { orderNumber: string; listingTitle: string | null }>();
    if (orderIds.length > 0) {
      // Query 1: order numbers (simple, reliable)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds);
      if (ordersError) console.error('[Wallet transactions] orders fetch failed:', ordersError);

      for (const order of orders || []) {
        orderMeta.set(order.id, { orderNumber: order.order_number, listingTitle: null });
      }

      // Query 2: listing titles (separate, failure is non-fatal)
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, listings(title)')
        .in('order_id', orderIds);
      if (itemsError) console.error('[Wallet transactions] order_items fetch failed:', itemsError);

      for (const item of items || []) {
        const title = (item.listings as unknown as { title: string } | null)?.title ?? null;
        if (title) {
          const existing = orderMeta.get(item.order_id);
          if (existing) existing.listingTitle = title;
        }
      }
    }

    // Batch-fetch withdrawal statuses
    const withdrawalMeta = new Map<string, string>();
    if (withdrawalIds.length > 0) {
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('id, status')
        .in('id', withdrawalIds);

      for (const wr of withdrawals || []) {
        withdrawalMeta.set(wr.id, wr.status);
      }
    }

    // Merge enrichment into each transaction
    const enriched = transactions.map((t) => ({
      ...t,
      orderNumber: t.orderId ? (orderMeta.get(t.orderId)?.orderNumber ?? null) : null,
      listingTitle: t.orderId ? (orderMeta.get(t.orderId)?.listingTitle ?? null) : null,
      withdrawalStatus: t.withdrawalId ? (withdrawalMeta.get(t.withdrawalId) ?? null) : null,
    }));

    return NextResponse.json({ transactions: enriched, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Fetch wallet transactions');
  }
}
