import { NextRequest, NextResponse } from 'next/server';
import { sendOrderCancelledToBuyer } from '@/lib/email/send-order-emails';
import { refundPayment } from '@/lib/everypay/client';
import { postOrderDeclinedMessage } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface DeclineOrderBody {
  reason?: string;
}

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
    const body: DeclineOrderBody = await request.json();
    const { reason } = body;

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

    // Process refund if required
    if (result.requires_refund) {
      try {
        // Fetch the order to get EveryPay reference and wallet debit info
        const { data: orderForRefund } = await supabase
          .from('orders')
          .select(
            'buyer_id, everypay_payment_reference, buyer_wallet_debit_cents, total_amount'
          )
          .eq('id', orderId)
          .single();

        if (orderForRefund) {
          const {
            buyer_id: buyerId,
            everypay_payment_reference: everypayRef,
            buyer_wallet_debit_cents: walletDebitCents,
            total_amount: totalAmount,
          } = orderForRefund;

          // Refund EveryPay card payment if one exists
          if (everypayRef) {
            // Calculate the EveryPay portion: total minus any wallet debit
            const everypayAmountCents = Math.round(
              totalAmount * 100 - (walletDebitCents || 0)
            );
            if (everypayAmountCents > 0) {
              await refundPayment(everypayRef, everypayAmountCents);
            }
          }

          // Refund wallet debit back to buyer's wallet
          if (walletDebitCents && walletDebitCents > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).rpc('credit_buyer_wallet_refund', {
              p_user_id: buyerId,
              p_amount_cents: walletDebitCents,
              p_order_id: orderId,
            });
          }

          // Update order with refund info
          await supabase
            .from('orders')
            .update({
              refunded_at: new Date().toISOString(),
              refund_amount: totalAmount,
            })
            .eq('id', orderId);
        }
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
