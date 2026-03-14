import { NextRequest, NextResponse } from 'next/server';
import { sendOrderCancelledToBuyer } from '@/lib/email/send-order-emails';
import { postOrderDeclinedMessage } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { processRefund, createRefundAdapter } from '@/lib/services/refund';
import { loggers } from '@/lib/logger';
import { z } from 'zod';

const log = loggers.payments;

const declineBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

// Type for the seller_decline_order RPC result
interface DeclineOrderResult {
  success: boolean;
  error?: string;
  requires_refund?: boolean;
  payment_intent_id?: string;
  refund_amount?: number;
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
    const parsed = declineBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }
    const { reason } = parsed.data;

    // Call database function to decline order
    const { data: rpcResult, error: declineError } = await supabase.rpc(
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

    const result = rpcResult as unknown as DeclineOrderResult;

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Post system message to transaction conversation (non-blocking)
    postOrderDeclinedMessage(orderId, reason);

    // Process refund if required (using shared refund service)
    let refundIncomplete = false;
    if (result.requires_refund) {
      try {
        const { createServiceClient } = await import('@/lib/supabase/client');
        const serviceClient = createServiceClient();
        const refundResult = await processRefund(serviceClient, orderId, createRefundAdapter());

        if (!refundResult.success) {
          refundIncomplete = true;
          log.error({ orderId, error: refundResult.error }, 'Refund failed on seller decline');
        }
      } catch (refundError) {
        refundIncomplete = true;
        log.error({ orderId, error: refundError }, 'Refund processing failed on seller decline');
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

      // In-app notification to buyer (non-blocking)
      try {
        const serviceClient = (await import('@/lib/supabase/client')).createServiceClient();
        await serviceClient.from('notifications').insert({
          user_id: order.buyer_id,
          type: 'order_cancelled',
          title: `Order #${order.order_number} cancelled`,
          body: 'The seller declined this order. Your refund is being processed.',
          data: { order_id: orderId },
        });
      } catch (notifErr) { console.error(`[Order] Notification insert failed for ${orderId}:`, notifErr); }
    }

    return NextResponse.json({
      success: true,
      orderId,
      refunded: result.requires_refund && !refundIncomplete,
      refundIncomplete,
      refundAmount: result.refund_amount,
      message: refundIncomplete
        ? 'Order declined but refund incomplete — staff notified'
        : 'Order declined and buyer refunded',
    });
  } catch (error) {
    return handleApiError(error, 'Decline order');
  }
}
