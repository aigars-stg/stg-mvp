import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/orders
 *
 * Get seller's orders
 * Query params:
 *   - status: Filter by order status (optional)
 * Returns list of orders for the authenticated seller
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Build query using orders_with_participants view
    // This eliminates the N+1 query for buyer names
    let query = supabase
      .from('orders_with_participants')
      .select(`
        *,
        order_items (
          id,
          game_name,
          bgg_game_id,
          price,
          condition,
          photo_url,
          game_thumbnail
        )
      `)
      .eq('seller_id', user.id);

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Fetch orders
    const { data: orders, error: ordersError } = await query.order('created_at', {
      ascending: false,
    });

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Enrich orders with calculated time remaining
    // Note: buyer_name now comes from the view, no separate query needed
    const enrichedOrders = orders.map((order) => {
      const timeRemaining =
        order.status === 'pending_seller' && order.seller_response_deadline
          ? new Date(order.seller_response_deadline).getTime() - Date.now()
          : null;

      return {
        ...order,
        // buyer_name, buyer_avatar, buyer_country already in view
        // Fall back to 'Unknown Buyer' if null (shouldn't happen)
        buyer_name: order.buyer_name || 'Unknown Buyer',
        time_remaining_ms: timeRemaining,
        is_expired: timeRemaining !== null && timeRemaining <= 0,
      };
    });

    const summary = enrichedOrders.reduce(
      (acc, o) => {
        acc.total++;
        const s = o.status;
        if (s === 'pending_seller') acc.pending++;
        else if (s === 'accepted') acc.accepted++;
        else if (s === 'shipped') acc.shipped++;
        else if (s === 'delivered') acc.delivered++;
        else if (s === 'disputed') acc.disputed++;
        else if (s === 'completed') acc.completed++;
        else if (s === 'cancelled') acc.cancelled++;
        return acc;
      },
      { total: 0, pending: 0, accepted: 0, shipped: 0, delivered: 0, disputed: 0, completed: 0, cancelled: 0 }
    );

    return NextResponse.json({ orders: enrichedOrders, summary });
  } catch (error) {
    return handleApiError(error, 'Fetch seller orders');
  }
}
