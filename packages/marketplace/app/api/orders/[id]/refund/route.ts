import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { refundPayment } from '@/lib/everypay/client';
import { EveryPayError } from '@/lib/everypay/client';
import { createServiceClient } from '@/lib/supabase/client';
import { loggers } from '@/lib/logger';
import { isRefundableStatus } from '@/lib/services/refund';
import { calculateEverypayPortionCents } from '@/lib/services/payment-capture';

const log = loggers.payments;

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
 *    credit the buyer wallet via credit_wallet RPC.
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
    if (!isRefundableStatus(order.status)) {
      return NextResponse.json(
        { error: `Order cannot be refunded (status: ${order.status})` },
        { status: 400 }
      );
    }

    log.info({ orderNumber: order.order_number, reason }, 'Processing refund');

    // -----------------------------------------------------------------------
    // 1. Refund EveryPay card payment (if applicable)
    // -----------------------------------------------------------------------
    let everyPayRefundState: string | null = null;

    if (order.everypay_payment_reference) {
      log.info({ paymentRef: order.everypay_payment_reference }, 'Refunding EveryPay payment');

      // Calculate the EveryPay portion: total minus any wallet debit
      const everyPayAmountCents = calculateEverypayPortionCents(
        order.total_amount,
        order.buyer_wallet_debit_cents
      );

      if (everyPayAmountCents > 0) {
        try {
          const refundResult = await refundPayment(
            order.everypay_payment_reference,
            everyPayAmountCents
          );

          everyPayRefundState = refundResult.payment_state;
          log.info({ paymentState: refundResult.payment_state, amountCents: everyPayAmountCents }, 'EveryPay refund result');
        } catch (everyPayError: unknown) {
          log.error({ error: everyPayError, orderId }, 'EveryPay refund failed');
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
      log.info({ amountCents: order.buyer_wallet_debit_cents, orderId }, 'Refunding wallet debit');

      const { error: walletError } = await adminSupabase
        .rpc('credit_wallet', {
          p_user_id: order.buyer_id,
          p_amount_cents: order.buyer_wallet_debit_cents,
          p_order_id: orderId,
          p_description: 'Refund — order refunded',
        });

      if (walletError) {
        log.error({ walletError, orderId }, 'Wallet refund failed');
        if (everyPayRefundState) {
          // EveryPay refund succeeded but wallet failed — partial refund
          log.error(
            { orderId, everyPayRefundState },
            'EveryPay refund succeeded but wallet refund failed — manual intervention needed'
          );
        } else {
          return NextResponse.json(
            { error: 'Failed to refund wallet balance' },
            { status: 500 }
          );
        }
      } else {
        walletRefunded = true;
        log.info({ amountCents: order.buyer_wallet_debit_cents, orderId }, 'Wallet refund credited');
      }
    }

    // -----------------------------------------------------------------------
    // 3. Update order status to refunded
    // -----------------------------------------------------------------------
    const walletRefundFailed = order.buyer_wallet_debit_cents > 0 && !walletRefunded;

    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'refunded',
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(walletRefundFailed && {
          refund_note: `Wallet refund of ${order.buyer_wallet_debit_cents} cents failed — manual credit needed`,
        }),
      })
      .eq('id', orderId);

    if (updateError) {
      log.error({ updateError, orderId }, 'Failed to update order status');
      // Refund was already processed, log error but don't fail
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      ...(everyPayRefundState && { everyPayRefundState }),
      ...(walletRefunded && { walletRefundedCents: order.buyer_wallet_debit_cents }),
      ...(walletRefundFailed && { walletRefundFailed: true }),
    });
  } catch (error) {
    return handleApiError(error, 'Process refund');
  }
}
