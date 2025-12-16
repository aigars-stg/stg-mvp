import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to view orders' },
        { status: 401 }
      );
    }

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Build query
    let query = supabase
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
      console.error('❌ [Seller Orders] Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Fetch buyer names
    const buyerIds = [...new Set(orders.map((o) => o.buyer_id))];
    const { data: buyers } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', buyerIds);

    const buyerMap = new Map(buyers?.map((b) => [b.id, b.full_name]) || []);

    // Enrich orders with buyer names and calculate time remaining
    const enrichedOrders = orders.map((order) => {
      const timeRemaining =
        order.status === 'pending_seller' && order.seller_response_deadline
          ? new Date(order.seller_response_deadline).getTime() - Date.now()
          : null;

      return {
        ...order,
        buyer_name: buyerMap.get(order.buyer_id) || 'Unknown Buyer',
        time_remaining_ms: timeRemaining,
        is_expired: timeRemaining !== null && timeRemaining <= 0,
      };
    });

    // Group orders by status for easy filtering on frontend
    const pending = enrichedOrders.filter((o) => o.status === 'pending_seller');
    const accepted = enrichedOrders.filter((o) => o.status === 'accepted');
    const shipped = enrichedOrders.filter((o) => o.status === 'shipped');
    const completed = enrichedOrders.filter((o) => o.status === 'completed');
    const cancelled = enrichedOrders.filter((o) => o.status === 'cancelled');

    return NextResponse.json({
      orders: enrichedOrders,
      summary: {
        total: enrichedOrders.length,
        pending: pending.length,
        accepted: accepted.length,
        shipped: shipped.length,
        completed: completed.length,
        cancelled: cancelled.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [Seller Orders] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}
