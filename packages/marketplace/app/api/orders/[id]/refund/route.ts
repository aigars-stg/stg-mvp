import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { reverseTransfer, canReverseTransfer } from '@/lib/stripe/transfer-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Params {
  params: Promise<{ id: string }>;
}

interface RefundBody {
  reason: string;
}

// Statuses that can be refunded
const REFUNDABLE_STATUSES = ['pending_seller', 'confirmed', 'shipped', 'delivered', 'disputed'];

/**
 * POST /api/orders/[id]/refund
 *
 * Issue a full refund for an order.
 * This is an admin/support action - full refunds only (no partial refunds in v1).
 *
 * Requirements:
 * - Order must be in a refundable status (paid, shipped, delivered, disputed)
 * - Order must have stripe_payment_intent_id
 * - Refunds full amount (items + shipping + service fee) to buyer
 * - Updates order status to 'refunded'
 * - Sets payout_status to 'not_applicable'
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const { id: orderId } = await params;
    const body: RefundBody = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Refund reason is required' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        payout_status,
        total_amount,
        stripe_payment_intent_id,
        stripe_transfer_id
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is buyer, seller, or admin
    // For now, only allow buyer or seller to request refund
    // TODO: Add proper admin role check
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to refund this order' },
        { status: 403 }
      );
    }

    // Check if order is in a refundable status
    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: `Order cannot be refunded (status: ${order.status})` },
        { status: 400 }
      );
    }

    // Check if already refunded
    if (order.status === 'refunded') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    // Track transfer reversal if needed
    let transferReversalId: string | null = null;

    // If transfer has been made to seller, reverse it first
    if (order.stripe_transfer_id && order.payout_status === 'completed') {
      console.log(`💸 [Refund] Transfer exists, checking if reversible: ${order.stripe_transfer_id}`);

      // Check if we can reverse the transfer
      const canReverse = await canReverseTransfer(order.stripe_transfer_id);
      if (!canReverse) {
        return NextResponse.json(
          { error: 'Cannot refund - transfer has already been reversed or cannot be found' },
          { status: 400 }
        );
      }

      // Reverse the transfer
      try {
        const reversal = await reverseTransfer({
          transferId: order.stripe_transfer_id,
          orderId: orderId,
        });
        transferReversalId = reversal.reversalId;
        console.log(`✅ [Refund] Transfer reversed: ${transferReversalId}`);
      } catch (reversalError: unknown) {
        console.error('❌ [Refund] Transfer reversal failed:', reversalError);
        const errorMessage = reversalError instanceof Error
          ? reversalError.message
          : 'Failed to reverse transfer';
        return NextResponse.json(
          { error: `Cannot refund - ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    // Check for payment intent ID
    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'Order has no payment intent ID - cannot process refund' },
        { status: 400 }
      );
    }

    console.log(`💸 [Refund] Processing refund for order ${order.order_number}`);
    console.log(`💸 [Refund] PaymentIntent: ${order.stripe_payment_intent_id}`);
    console.log(`💸 [Refund] Reason: ${reason}`);

    // Create refund in Stripe
    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        reason: 'requested_by_customer',
        metadata: {
          order_id: orderId,
          order_number: order.order_number,
          refund_reason: reason,
          refunded_by: user.id,
        },
      });

      console.log(`✅ [Refund] Stripe refund created: ${refund.id}`);

      // Update order status with refund tracking IDs
      const updateData: Record<string, string | null> = {
        status: 'refunded',
        payout_status: 'not_applicable',
        refund_reason: reason,
        stripe_refund_id: refund.id,
        updated_at: new Date().toISOString(),
      };

      // Include transfer reversal ID if we reversed a transfer
      if (transferReversalId) {
        updateData.stripe_transfer_reversal_id = transferReversalId;
      }

      const { error: updateError } = await adminSupabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) {
        console.error('❌ [Refund] Failed to update order status:', updateError);
        // Refund was already processed in Stripe, log error but don't fail
      }

      return NextResponse.json({
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        orderNumber: order.order_number,
        ...(transferReversalId && { transferReversalId }),
      });
    } catch (stripeError: unknown) {
      console.error('❌ [Refund] Stripe refund failed:', stripeError);

      const errorMessage =
        stripeError instanceof Stripe.errors.StripeError
          ? stripeError.message
          : 'Failed to process refund';

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error, 'Process refund');
  }
}
