import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { processRefund, createRefundAdapter } from '@/lib/services/refund';
import { createServiceClient } from '@/lib/supabase/client';

const adminSupabase = createServiceClient();

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/seller/orders/[id]/cancel
 *
 * Seller cancels an accepted order before shipping.
 * Only allowed when status is 'accepted' and no tracking events exist.
 * Auto-refunds buyer and relists items.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const { id: orderId } = await params;

    // Get order
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('id, order_number, seller_id, buyer_id, status, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify seller owns this order
    if (order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Only allow cancellation of accepted orders
    if (order.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Can only cancel orders that have been accepted but not yet shipped' },
        { status: 400 }
      );
    }

    // Check no tracking events exist (parcel not yet dropped off)
    const { data: trackingEvents } = await adminSupabase
      .from('tracking_events')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (trackingEvents && trackingEvents.length > 0) {
      return NextResponse.json(
        { error: 'Cannot cancel after the parcel has been shipped. Please wait for delivery and use the dispute process if needed.' },
        { status: 400 }
      );
    }

    // Cancel the order
    const now = new Date().toISOString();
    const { error: cancelError } = await adminSupabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Seller cancelled before shipping.',
        cancelled_at: now,
        cancelled_by: user.id,
        updated_at: now,
      })
      .eq('id', orderId);

    if (cancelError) {
      return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
    }

    // Process refund
    const refundResult = await processRefund(adminSupabase, orderId, createRefundAdapter());

    if (!refundResult.success) {
      console.error(`Refund failed for seller-cancelled order ${order.order_number}:`, refundResult.error);
    }

    // Relist items
    const { data: orderItems } = await adminSupabase
      .from('order_items')
      .select('listing_id')
      .eq('order_id', orderId);

    if (orderItems && orderItems.length > 0) {
      const listingIds = orderItems.map(item => item.listing_id);
      await adminSupabase
        .from('listings')
        .update({ status: 'active', sold_at: null, updated_at: now })
        .in('id', listingIds);
    }

    console.log(`[Order] Seller cancelled order ${order.order_number} before shipping`);

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      message: 'Order cancelled. The buyer will be refunded.',
    });
  } catch (error) {
    return handleApiError(error, 'Seller cancel order');
  }
}
