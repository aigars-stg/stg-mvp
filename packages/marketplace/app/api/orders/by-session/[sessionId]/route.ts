import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/orders/by-session/[sessionId]
 *
 * Fetch order details by EveryPay payment reference or order ID.
 * Used by the success page to verify order creation and display details.
 *
 * The sessionId param can be:
 * - An EveryPay payment reference
 * - An order UUID (for wallet-only purchases)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const selectFields = `
      id,
      order_number,
      buyer_id,
      seller_id,
      shipping_method,
      destination_terminal_name,
      pickup_city,
      items_total,
      shipping_cost,
      total_amount,
      status,
      seller_response_deadline,
      buyer_wallet_debit_cents,
      created_at,
      order_items (
        id,
        game_name,
        price,
        photo_url,
        game_thumbnail
      )
    `;

    // Try to find the order by EveryPay payment reference first, then by order ID
    let order;

    // Try by EveryPay payment reference
    const { data: epOrder } = await supabase
      .from('orders')
      .select(selectFields)
      .eq('everypay_payment_reference', sessionId)
      .single();

    if (epOrder) {
      order = epOrder;
    } else {
      // Try by order ID (UUID format - for wallet-only purchases)
      const { data: idOrder } = await supabase
        .from('orders')
        .select(selectFields)
        .eq('id', sessionId)
        .single();

      order = idOrder;
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found', processing: true },
        { status: 404 }
      );
    }

    // Access control: verify user is buyer or seller
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get seller name
    const { data: sellerProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', order.seller_id)
      .single();

    return NextResponse.json({
      order: {
        order_id: order.id,
        order_number: order.order_number,
        seller_name: sellerProfile?.full_name || 'Seller',
        shipping_method: order.shipping_method,
        destination: order.shipping_method === 't2t'
          ? order.destination_terminal_name
          : order.pickup_city,
        items_total: order.items_total,
        shipping_cost: order.shipping_cost,
        total_amount: order.total_amount,
        wallet_debit_cents: order.buyer_wallet_debit_cents || 0,
        status: order.status,
        seller_response_deadline: order.seller_response_deadline,
        items: order.order_items,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Fetch order by session');
  }
}
