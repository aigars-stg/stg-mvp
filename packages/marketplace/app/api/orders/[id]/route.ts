import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/orders/[id]
 *
 * Get detailed information about a specific order
 * Accessible by both buyer and seller
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to view order details' },
        { status: 401 }
      );
    }

    const orderId = params.id;

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          listing_id,
          game_name,
          bgg_game_id,
          price,
          condition,
          photo_url
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch order', details: orderError.message },
        { status: 500 }
      );
    }

    // Check access: user must be either buyer or seller
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this order' },
        { status: 403 }
      );
    }

    // Fetch buyer and seller profiles
    const { data: buyerProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, country')
      .eq('id', order.buyer_id)
      .single();

    const { data: sellerProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, country')
      .eq('id', order.seller_id)
      .single();

    // Fetch tracking events for T2T orders
    let trackingEvents = null;
    if (order.shipping_method === 't2t' && order.barcode) {
      const { data: events } = await supabase
        .from('tracking_events')
        .select('id, event_type, state_type, state_text, location, description, event_timestamp')
        .eq('order_id', orderId)
        .order('event_timestamp', { ascending: true });

      trackingEvents = events || [];
    }

    // Calculate time remaining if pending seller
    const timeRemaining =
      order.status === 'pending_seller' && order.seller_response_deadline
        ? new Date(order.seller_response_deadline).getTime() - Date.now()
        : null;

    // Enrich order with profiles and time info
    const enrichedOrder = {
      ...order,
      buyer_profile: buyerProfile
        ? {
          id: buyerProfile.id,
          name: buyerProfile.full_name,
          email: buyerProfile.email,
          phone: buyerProfile.phone,
          country: buyerProfile.country,
        }
        : null,
      seller_profile: sellerProfile
        ? {
          id: sellerProfile.id,
          name: sellerProfile.full_name,
          email: sellerProfile.email,
          phone: sellerProfile.phone,
          country: sellerProfile.country,
        }
        : null,
      tracking_events: trackingEvents,
      time_remaining_ms: timeRemaining,
      is_expired: timeRemaining !== null && timeRemaining <= 0,
      viewer_role: order.buyer_id === user.id ? 'buyer' : 'seller',
    };

    return NextResponse.json({ order: enrichedOrder });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch order', details: message },
      { status: 500 }
    );
  }
}
