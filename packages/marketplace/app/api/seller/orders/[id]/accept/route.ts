import { NextRequest, NextResponse } from 'next/server';
import { sendOrderAcceptedToBuyer } from '@/lib/email/send-order-emails';
import { postOrderAcceptedMessage } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { UNISEND_DEFAULT_PARCEL_SIZE } from '@/lib/unisend/types';
import { prepareAndGenerateLabel } from '@/lib/unisend/prepare-and-generate-label';
import { capturePayment } from '@/lib/everypay/client';
import { calculateEverypayPortionCents, needsCapture } from '@/lib/services/payment-capture';

// Type for the seller_accept_order RPC result
interface AcceptOrderResult {
  success: boolean;
  error?: string;
  shipping_method?: string;
}

/**
 * POST /api/seller/orders/[id]/accept
 *
 * Seller accepts an order. Parcel size is always M (UNISEND_DEFAULT_PARCEL_SIZE).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.id;
    const parcelSize = UNISEND_DEFAULT_PARCEL_SIZE;

    // Call database function to accept order
    const { data: rpcResult, error: acceptError } = await supabase.rpc(
      'seller_accept_order',
      {
        p_order_id: orderId,
        p_seller_id: user.id,
        p_parcel_size: parcelSize,
      }
    );

    if (acceptError) {
      return NextResponse.json(
        { error: 'Failed to accept order', details: acceptError.message },
        { status: 500 }
      );
    }

    const result = rpcResult as unknown as AcceptOrderResult;

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Capture pre-authorised EveryPay payment if applicable
    {
      const { data: paymentOrder } = await supabase
        .from('orders')
        .select('everypay_payment_reference, everypay_payment_state, total_amount, buyer_wallet_debit_cents')
        .eq('id', orderId)
        .single();

      if (paymentOrder) {
        const everypayAmountCents = calculateEverypayPortionCents(
          paymentOrder.total_amount,
          paymentOrder.buyer_wallet_debit_cents
        );
        if (needsCapture(paymentOrder.everypay_payment_state, paymentOrder.everypay_payment_reference, everypayAmountCents)) {
          try {
            await capturePayment(paymentOrder.everypay_payment_reference!, everypayAmountCents);
            await supabase
              .from('orders')
              .update({ everypay_payment_state: 'settled' })
              .eq('id', orderId);
          } catch (captureErr) {
            console.error('[Accept Order] Payment capture failed, marking for retry:', captureErr);
            // Mark for retry — the expire-seller-deadlines cron will retry capture every 5 minutes
            await supabase
              .from('orders')
              .update({
                everypay_payment_state: 'capture_pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', orderId);
          }
        }
      }
    }

    // Fetch complete order details for email and label generation
    const { data: order } = await supabase
      .from('orders')
      .select(`
        order_number,
        buyer_id,
        shipping_method,
        destination_terminal_name,
        destination_terminal_id,
        destination_terminal_address,
        destination_country,
        pickup_city,
        parcel_size,
        receiver_name,
        receiver_phone,
        receiver_email
      `)
      .eq('id', orderId)
      .single();

    let labelGenerated = false;
    let labelErrorResult: string | null = null;
    let trackingNumber: string | undefined;
    let trackingUrl: string | undefined;

    if (order) {
      // Fetch buyer and seller profiles with contact info
      const { data: buyerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email, phone, country')
        .eq('id', order.buyer_id)
        .single();

      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email, phone, country')
        .eq('id', user.id)
        .single();

      if (buyerProfile && sellerProfile) {
        // For T2T orders, generate Unisend shipping label
        if (order.shipping_method === 't2t') {
          const labelResult = await prepareAndGenerateLabel({
            orderId,
            orderNumber: order.order_number,
            seller: {
              fullName: sellerProfile.full_name,
              phone: sellerProfile.phone || '',
              email: sellerProfile.email,
              country: sellerProfile.country,
            },
            buyer: {
              fullName: buyerProfile.full_name,
              email: buyerProfile.email,
            },
            receiver: {
              name: order.receiver_name || buyerProfile.full_name,
              phone: order.receiver_phone || buyerProfile.phone || '',
            },
            destination: {
              country: order.destination_country,
              terminalId: order.destination_terminal_id || '',
              terminalName: order.destination_terminal_name || '',
              terminalAddress: order.destination_terminal_address || '',
            },
            parcelSize: order.parcel_size,
          });

          labelGenerated = labelResult.labelGenerated;
          labelErrorResult = labelResult.labelError || null;
          trackingNumber = labelResult.trackingNumber;
          trackingUrl = labelResult.trackingUrl;
        }

        // Send acceptance email to buyer
        const destinationInfo = order.destination_terminal_name || '';

        sendOrderAcceptedToBuyer({
          buyerName: buyerProfile.full_name,
          buyerEmail: buyerProfile.email,
          orderNumber: order.order_number,
          orderId: orderId,
          sellerName: sellerProfile.full_name,
          shippingMethod: (order.shipping_method || 't2t') as 't2t',
          destinationInfo,
          trackingNumber,
          trackingUrl,
        }).catch(() => {});
      }
    }

    // Post system message now that labelGenerated is known (non-blocking)
    postOrderAcceptedMessage(
      orderId,
      (result.shipping_method || 't2t') as 't2t',
      labelGenerated
    );

    return NextResponse.json({
      success: true,
      orderId,
      shippingMethod: result.shipping_method,
      labelGenerated,
      labelError: labelErrorResult,
      message: labelGenerated || order?.shipping_method !== 't2t'
        ? 'Order accepted successfully'
        : 'Order accepted, but label generation failed. You can retry from the order details page.',
    });
  } catch (error) {
    return handleApiError(error, 'Accept order');
  }
}
