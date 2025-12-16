import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/seller/orders/[id]
 *
 * Get detailed information about a single order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const orderId = params.id;

    // Fetch order with all details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        shipping_method,
        destination_terminal_name,
        destination_terminal_address,
        destination_country,
        pickup_city,
        pickup_notes,
        receiver_name,
        receiver_phone,
        receiver_email,
        items_total,
        shipping_cost,
        service_fee,
        total_amount,
        created_at,
        paid_at,
        seller_response_deadline,
        seller_responded_at,
        parcel_size,
        barcode,
        tracking_url,
        label_url,
        label_generated_at
      `)
      .eq('id', orderId)
      .eq('seller_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found or you do not have permission to view it' },
        { status: 404 }
      );
    }

    // Fetch buyer profile
    const { data: buyerProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone')
      .eq('id', order.buyer_id)
      .single();

    // Fetch order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, game_name, price, condition, photo_url')
      .eq('order_id', orderId);

    // Calculate time remaining for pending orders
    let timeRemainingMs: number | null = null;
    let isExpired = false;

    if (order.status === 'pending_seller' && order.seller_response_deadline) {
      const deadline = new Date(order.seller_response_deadline).getTime();
      const now = Date.now();
      timeRemainingMs = deadline - now;
      isExpired = timeRemainingMs <= 0;
    }

    // Combine data
    const orderWithDetails = {
      ...order,
      buyer_name: buyerProfile?.full_name || 'Unknown',
      buyer_email: buyerProfile?.email || '',
      buyer_phone: buyerProfile?.phone || '',
      order_items: orderItems || [],
      time_remaining_ms: timeRemainingMs,
      is_expired: isExpired,
    };

    return NextResponse.json({ order: orderWithDetails });
  } catch (error: any) {
    console.error('❌ [Seller] Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    );
  }
}
