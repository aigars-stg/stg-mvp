import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/orders/by-session/[sessionId]
 *
 * Fetch order details by Stripe checkout session ID
 * Used by the success page to verify order creation and display details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId || !sessionId.startsWith('cs_')) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Retrieve the Stripe checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError: unknown) {
      // Stripe errors have a 'code' property
      if (stripeError && typeof stripeError === 'object' && 'code' in stripeError && stripeError.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      throw stripeError;
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', payment_status: session.payment_status },
        { status: 400 }
      );
    }

    // Get payment intent ID
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent found in session' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Get current user (optional - for access control)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Query order by payment intent ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        shipping_method,
        destination_terminal_name,
        pickup_city,
        items_total,
        shipping_cost,
        service_fee,
        total_amount,
        status,
        seller_response_deadline,
        created_at,
        order_items (
          id,
          game_name,
          price,
          photo_url
        )
      `)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        // Order not found yet - webhook may still be processing
        return NextResponse.json(
          { error: 'Order not found', processing: true },
          { status: 404 }
        );
      }
      throw orderError;
    }

    // Access control: if user is logged in, verify they are buyer or seller
    if (user && order.buyer_id !== user.id && order.seller_id !== user.id) {
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
        service_fee: order.service_fee,
        total_amount: order.total_amount,
        status: order.status,
        seller_response_deadline: order.seller_response_deadline,
        items: order.order_items,
      },
    });
  } catch (error: unknown) {
    console.error('[by-session] Error fetching order:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch order', details: message },
      { status: 500 }
    );
  }
}
