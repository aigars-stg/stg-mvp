import { NextRequest, NextResponse } from 'next/server';
import { sendOrderCancelledToBuyer } from '@/lib/email/send-order-emails';
import { stripe } from '@/lib/stripe';
import { postOrderDeclinedMessage } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface DeclineOrderBody {
  reason?: string;
}

/**
 * POST /api/seller/orders/[id]/decline
 *
 * Seller declines an order
 * Body: { reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.id;
    const body: DeclineOrderBody = await request.json();
    const { reason } = body;

    // Call database function to decline order
    const { data: result, error: declineError } = await (supabase as any).rpc(
      'seller_decline_order',
      {
        p_order_id: orderId,
        p_seller_id: user.id,
        p_reason: reason || 'Seller declined',
      }
    );

    if (declineError) {
      return NextResponse.json(
        { error: 'Failed to decline order', details: declineError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Post system message to transaction conversation (non-blocking)
    postOrderDeclinedMessage(orderId, reason);

    // Process refund if required
    if (result.requires_refund && result.payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: result.payment_intent_id,
          reason: 'requested_by_customer',
        });

        // Update order with refund info
        await supabase
          .from('orders')
          .update({
            refunded_at: new Date().toISOString(),
            refund_amount: result.refund_amount,
          })
          .eq('id', orderId);
      } catch {
        // Don't fail the whole request, order is already declined
      }
    }

    // Fetch order details for email
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, buyer_id, total_amount, seller_decline_reason')
      .eq('id', orderId)
      .single();

    if (order) {
      // Fetch buyer and seller profiles
      const { data: buyerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', order.buyer_id)
        .single();

      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Send cancellation email to buyer
      if (buyerProfile && sellerProfile) {
        sendOrderCancelledToBuyer({
          buyerName: buyerProfile.full_name,
          buyerEmail: buyerProfile.email,
          orderNumber: order.order_number,
          sellerName: sellerProfile.full_name,
          refundAmount: order.total_amount,
          cancellationReason: order.seller_decline_reason || 'Seller declined',
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      refunded: result.requires_refund,
      refundAmount: result.refund_amount,
      message: 'Order declined and buyer refunded',
    });
  } catch (error) {
    return handleApiError(error, 'Decline order');
  }
}
