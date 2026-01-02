import { NextRequest, NextResponse } from 'next/server';
import { postReceiptConfirmedMessage, postOrderCompletedMessage } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/transactions/[orderId]/confirm-receipt
 *
 * Buyer confirms receipt of the order, marking it as completed.
 * Available when order status is 'delivered'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.orderId;

    // Fetch order and verify access
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only buyer can confirm receipt
    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the buyer can confirm receipt' },
        { status: 403 }
      );
    }

    // Order must be in 'delivered' status
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: `Cannot confirm receipt for order with status '${order.status}'. Order must be 'delivered'.` },
        { status: 400 }
      );
    }

    // Update order to completed
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to confirm receipt' },
        { status: 500 }
      );
    }

    // Post system messages (non-blocking)
    await postReceiptConfirmedMessage(orderId);
    await postOrderCompletedMessage(orderId);

    return NextResponse.json({
      success: true,
      order_number: order.order_number,
      message: 'Receipt confirmed. Order is now complete.',
    });
  } catch (error) {
    return handleApiError(error, 'Confirm receipt');
  }
}
