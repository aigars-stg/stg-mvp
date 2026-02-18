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

    // Fetch buyer's orders with pre-joined seller data
    // Uses orders_with_participants view to eliminate N+1 query for seller names
    const { data: orders, error: ordersError } = await supabase
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
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Enrich orders with calculated time remaining
    // Note: seller_name now comes from the view, no separate query needed
    const enrichedOrders = orders.map(order => {
      const timeRemaining =
        order.status === 'pending_seller' && order.seller_response_deadline
          ? new Date(order.seller_response_deadline).getTime() - Date.now()
          : null;

      return {
        ...order,
        // seller_name, seller_avatar, seller_country already in view
        // Fall back to 'Unknown Seller' if null (shouldn't happen)
        seller_name: order.seller_name || 'Unknown Seller',
        time_remaining_ms: timeRemaining,
        is_expired: timeRemaining !== null && timeRemaining <= 0,
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (error) {
    return handleApiError(error, 'Fetch orders');
  }
}
