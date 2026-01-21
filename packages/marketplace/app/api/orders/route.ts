import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/orders
 *
 * Get buyer's orders
 * Returns list of orders for the authenticated buyer
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Fetch buyer's orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          game_name,
          bgg_game_id,
          price,
          condition,
          photo_url
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Fetch seller names
    const sellerIds = [...new Set(orders.map(o => o.seller_id))];
    const { data: sellers } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', sellerIds);

    const sellerMap = new Map(sellers?.map(s => [s.id, s.full_name]) || []);

    // Enrich orders with seller names and calculate time remaining
    const enrichedOrders = orders.map(order => {
      const timeRemaining =
        order.status === 'pending_seller' && order.seller_response_deadline
          ? new Date(order.seller_response_deadline).getTime() - Date.now()
          : null;

      return {
        ...order,
        seller_name: sellerMap.get(order.seller_id) || 'Unknown Seller',
        time_remaining_ms: timeRemaining,
        is_expired: timeRemaining !== null && timeRemaining <= 0,
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (error) {
    return handleApiError(error, 'Fetch orders');
  }
}
