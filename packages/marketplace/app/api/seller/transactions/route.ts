import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface Transaction {
  id: string;
  type: 'sale' | 'payout';
  reference: string;
  status: string;
  payoutStatus?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * GET /api/seller/transactions
 *
 * Get seller's transaction history (sales and payouts)
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'all'; // 'sale', 'payout', or 'all'

    const transactions: Transaction[] = [];
    let totalCount = 0;

    // Fetch sales (orders)
    if (type === 'all' || type === 'sale') {
      const { data: orders, error: ordersError, count: ordersCount } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payout_status,
          items_total,
          shipping_cost,
          service_fee,
          created_at,
          updated_at
        `, { count: 'exact' })
        .eq('seller_id', user.id)
        .not('status', 'in', '("pending_payment","cancelled")')
        .order('created_at', { ascending: false });

      if (!ordersError && orders) {
        // Get game names for orders
        const orderIds = orders.map(o => o.id);
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id, game_name')
          .in('order_id', orderIds);

        const gameNameMap = new Map<string, string>();
        if (orderItems) {
          for (const item of orderItems) {
            if (!gameNameMap.has(item.order_id)) {
              gameNameMap.set(item.order_id, item.game_name);
            }
          }
        }

        for (const order of orders) {
          const gross = Number(order.items_total) + Number(order.shipping_cost);
          transactions.push({
            id: order.id,
            type: 'sale',
            reference: order.order_number,
            status: order.status,
            payoutStatus: order.payout_status || undefined,
            grossAmount: gross,
            platformFee: Number(order.service_fee),
            netAmount: gross, // Seller gets full gross
            description: gameNameMap.get(order.id) || 'Game sale',
            createdAt: order.created_at || new Date().toISOString(),
            completedAt: order.updated_at,
          });
        }

        totalCount += ordersCount || 0;
      }
    }

    // Fetch bank payouts
    if (type === 'all' || type === 'payout') {
      const { data: payouts, error: payoutsError, count: payoutsCount } = await supabase
        .from('seller_payouts')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!payoutsError && payouts) {
        for (const payout of payouts) {
          const amount = Number(payout.amount);
          transactions.push({
            id: payout.id,
            type: 'payout',
            reference: payout.stripe_payout_id || '',
            status: payout.status || 'unknown',
            grossAmount: -amount, // Negative for payouts (money out)
            platformFee: 0,
            netAmount: -amount,
            description: `Payout to ****${payout.bank_account_last4 || '****'}`,
            createdAt: payout.created_at || new Date().toISOString(),
            completedAt: payout.paid_at,
          });
        }

        totalCount += payoutsCount || 0;
      }
    }

    // Sort by date (most recent first)
    transactions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    return NextResponse.json({
      transactions: paginatedTransactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + paginatedTransactions.length < totalCount,
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
