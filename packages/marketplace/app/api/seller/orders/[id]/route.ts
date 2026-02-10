import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

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
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.id;

    // Define the expected order shape (some columns may not be in Supabase types yet)
    interface OrderRow {
      id: string;
      order_number: string;
      buyer_id: string;
      seller_id: string;
      status: string;
      shipping_method: string;
      destination_terminal_name: string | null;
      destination_terminal_address: string | null;
      destination_country: string | null;
      pickup_city: string | null;
      pickup_notes: string | null;
      receiver_name: string | null;
      receiver_phone: string | null;
      receiver_email: string | null;
      items_total: number;
      shipping_cost: number;
      total_amount: number;
      platform_commission_cents: number | null;
      seller_wallet_credit_cents: number | null;
      created_at: string;
      paid_at: string | null;
      seller_response_deadline: string | null;
      seller_responded_at: string | null;
      parcel_size: string | null;
      unisend_parcel_id: number | null;
      barcode: string | null;
      tracking_url: string | null;
      label_url: string | null;
      label_generated_at: string | null;
      label_error: string | null;
    }

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
        total_amount,
        platform_commission_cents,
        seller_wallet_credit_cents,
        created_at,
        paid_at,
        seller_response_deadline,
        seller_responded_at,
        parcel_size,
        unisend_parcel_id,
        barcode,
        tracking_url,
        label_url,
        label_generated_at,
        label_error
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

    // Cast to expected type (label_error column may not be in generated types yet)
    const orderData = order as unknown as OrderRow;

    // Fetch buyer profile
    const { data: buyerProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone')
      .eq('id', orderData.buyer_id)
      .single();

    // Fetch order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, game_name, price, condition, photo_url')
      .eq('order_id', orderId);

    // Fetch tracking events for T2T orders
    let trackingEvents = null;
    if (orderData.shipping_method === 't2t' && orderData.barcode) {
      const { data: events } = await supabase
        .from('tracking_events')
        .select('id, event_type, state_type, state_text, location, description, event_timestamp')
        .eq('order_id', orderId)
        .order('event_timestamp', { ascending: true });

      trackingEvents = events || [];
    }

    // Calculate time remaining for pending orders
    let timeRemainingMs: number | null = null;
    let isExpired = false;

    if (orderData.status === 'pending_seller' && orderData.seller_response_deadline) {
      const deadline = new Date(orderData.seller_response_deadline).getTime();
      const now = Date.now();
      timeRemainingMs = deadline - now;
      isExpired = timeRemainingMs <= 0;
    }

    // Combine data
    const orderWithDetails = {
      ...orderData,
      buyer_name: buyerProfile?.full_name || 'Unknown',
      buyer_email: buyerProfile?.email || '',
      buyer_phone: buyerProfile?.phone || '',
      order_items: orderItems || [],
      tracking_events: trackingEvents,
      time_remaining_ms: timeRemainingMs,
      is_expired: isExpired,
    };

    return NextResponse.json({ order: orderWithDetails });
  } catch (error) {
    return handleApiError(error, 'Fetch seller order');
  }
}
