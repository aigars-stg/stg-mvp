import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { refundPayment } from '@/lib/everypay/client';
import { EveryPayError } from '@/lib/everypay/client';
import { createServiceClient } from '@/lib/supabase/client';

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
 * Refund flow:
 * 1. If order was paid via EveryPay (has everypay_payment_reference),
 *    refund the card payment via EveryPay API.
 * 2. If order used wallet balance (buyer_wallet_debit_cents > 0),
 *    credit the buyer wallet via credit_buyer_wallet_refund RPC.
 * 3. Update order status to 'refunded' with reason and timestamp.
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
        total_amount,
        everypay_payment_reference,
        buyer_wallet_debit_cents
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is buyer, seller, or staff
    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.is_staff === true;
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isStaff && !isBuyer && !isSeller) {
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

    console.log(`[Refund] Processing refund for order ${order.order_number}`);
    console.log(`[Refund] Reason: ${reason}`);

    // -----------------------------------------------------------------------
    // 1. Refund EveryPay card payment (if applicable)
    // -----------------------------------------------------------------------
    let everyPayRefundState: string | null = null;

    if (order.everypay_payment_reference) {
      console.log(`[Refund] EveryPay payment ref: ${order.everypay_payment_reference}`);

      // Calculate the EveryPay portion: total minus any wallet debit
      const walletDebitCents = order.buyer_wallet_debit_cents ?? 0;
      const totalCents = Math.round(order.total_amount * 100);
      const everyPayAmountCents = totalCents - walletDebitCents;

      if (everyPayAmountCents > 0) {
        try {
          const refundResult = await refundPayment(
            order.everypay_payment_reference,
            everyPayAmountCents
          );

          everyPayRefundState = refundResult.payment_state;
          console.log(`[Refund] EveryPay refund result: ${refundResult.payment_state}`);
        } catch (everyPayError: unknown) {
          console.error('[Refund] EveryPay refund failed:', everyPayError);
          const errorMessage = everyPayError instanceof EveryPayError
            ? everyPayError.message
            : 'Failed to process EveryPay refund';

          return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // 2. Refund wallet portion (if applicable)
    // -----------------------------------------------------------------------
    let walletRefunded = false;

    if (order.buyer_wallet_debit_cents && order.buyer_wallet_debit_cents > 0) {
      console.log(`[Refund] Wallet debit to refund: ${order.buyer_wallet_debit_cents} cents`);

      const { error: walletError } = await (adminSupabase
        .rpc as (...args: unknown[]) => ReturnType<typeof adminSupabase.rpc>)('credit_buyer_wallet_refund', {
          p_user_id: order.buyer_id,
          p_amount_cents: order.buyer_wallet_debit_cents,
          p_order_id: orderId,
        });

      if (walletError) {
        console.error('[Refund] Wallet refund failed:', walletError);
        // If EveryPay refund already succeeded, we have a partial refund problem
        // Log it but continue to update order status
        if (everyPayRefundState) {
          console.error(
            '[Refund] WARNING: EveryPay refund succeeded but wallet refund failed. Manual intervention needed.'
          );
        } else {
          return NextResponse.json(
            { error: 'Failed to refund wallet balance' },
            { status: 500 }
          );
        }
      } else {
        walletRefunded = true;
        console.log(`[Refund] Wallet refund credited: ${order.buyer_wallet_debit_cents} cents`);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Update order status to refunded
    // -----------------------------------------------------------------------
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'refunded',
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[Refund] Failed to update order status:', updateError);
      // Refund was already processed, log error but don't fail
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      ...(everyPayRefundState && { everyPayRefundState }),
      ...(walletRefunded && { walletRefundedCents: order.buyer_wallet_debit_cents }),
    });
  } catch (error) {
    return handleApiError(error, 'Process refund');
  }
}
