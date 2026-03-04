import { NextRequest, NextResponse } from 'next/server';
import { sendOrderAcceptedToBuyer, sendShippingLabelToSeller } from '@/lib/email/send-order-emails';
import { generateShippingLabel, updateOrderWithShippingData, updateOrderLabelError } from '@/lib/unisend/label-service';
import { postOrderAcceptedMessage } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { UnisendValidationError } from '@/lib/unisend/types';
import { formatLabelError } from '@/lib/unisend/format-label-error';
import { detectPhoneCountry, composePhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils';
import { capturePayment } from '@/lib/everypay/client';
import { calculateEverypayPortionCents, needsCapture } from '@/lib/services/payment-capture';

interface AcceptOrderBody {
  parcelSize?: 'XS' | 'S' | 'M' | 'L'; // Required for T2T orders
}

// Type for the seller_accept_order RPC result
interface AcceptOrderResult {
  success: boolean;
  error?: string;
  shipping_method?: string;
}

/**
 * POST /api/seller/orders/[id]/accept
 *
 * Seller accepts an order
 * Body: { parcelSize?: 'XS' | 'S' | 'M' | 'L' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.id;
    const body: AcceptOrderBody = await request.json();
    const { parcelSize } = body;

    // Call database function to accept order
    const { data: rpcResult, error: acceptError } = await supabase.rpc(
      'seller_accept_order',
      {
        p_order_id: orderId,
        p_seller_id: user.id,
        p_parcel_size: parcelSize ?? undefined,
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
            console.error('❌ [Accept Order] Payment capture failed:', captureErr);
            // Order is already accepted — payment may auto-capture within the delay window
          }
        }
      }
    }

    // System message is posted after label generation result is known (see below)

    // Fetch complete order details for email and label generation (including receiver info from checkout)
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
        let trackingNumber: string | undefined;
        let trackingUrl: string | undefined;
        let labelError: string | null = null;

        // For T2T orders, generate Unisend shipping label
        if (order.shipping_method === 't2t') {
          // Use receiver info from order (provided during checkout) with fallback to buyer profile
          const receiverName = order.receiver_name || buyerProfile.full_name;
          const rawReceiverPhone = order.receiver_phone || buyerProfile.phone || '';
          const rawSellerPhone = sellerProfile.phone || '';

          // Normalize phones — legacy profiles may store local numbers without country prefix
          const sellerPhoneParsed = detectPhoneCountry(rawSellerPhone);
          const normalizedSellerPhone = composePhoneNumber(sellerPhoneParsed.country, sellerPhoneParsed.localNumber);
          const receiverPhoneParsed = detectPhoneCountry(rawReceiverPhone);
          const normalizedReceiverPhone = composePhoneNumber(receiverPhoneParsed.country, receiverPhoneParsed.localNumber);

          // Validate phones before attempting label generation
          if (normalizedSellerPhone && !isValidPhoneNumber(normalizedSellerPhone)) {
            console.error(`❌ [Accept Order] Invalid seller phone: ${rawSellerPhone} → ${normalizedSellerPhone}`);
            await updateOrderLabelError(orderId, `Invalid seller phone number. Please update your phone in Account Settings.`);
            postOrderAcceptedMessage(
              orderId,
              (result.shipping_method || 't2t') as 't2t' | 'local_pickup',
              false
            );
            return NextResponse.json({
              success: true,
              orderId,
              shippingMethod: result.shipping_method,
              labelGenerated: false,
              labelError: 'Invalid seller phone number. Please update your phone in Account Settings.',
              message: 'Order accepted, but label generation failed due to invalid seller phone number.',
            });
          }

          // Validate countries before attempting label generation
          if (!sellerProfile.country || !['LV', 'LT', 'EE'].includes(sellerProfile.country)) {
            await supabase.from('orders').update({
              label_error: 'Seller country not set. Please update your country in Account Settings.',
              updated_at: new Date().toISOString(),
            }).eq('id', orderId);

            return NextResponse.json({
              success: true,
              orderId,
              shippingMethod: result.shipping_method,
              labelGenerated: false,
              labelError: 'Seller country not set',
            });
          }

          if (!order.destination_country || !['LV', 'LT', 'EE'].includes(order.destination_country)) {
            await supabase.from('orders').update({
              label_error: 'Destination country missing on order.',
              updated_at: new Date().toISOString(),
            }).eq('id', orderId);

            return NextResponse.json({
              success: true,
              orderId,
              shippingMethod: result.shipping_method,
              labelGenerated: false,
              labelError: 'Destination country missing',
            });
          }

          try {
            console.log(`📦 [Accept Order] Generating shipping label for order ${orderId}...`);
            console.log(`📦 [Accept Order] Sender: ${sellerProfile.full_name}, Phone: ${rawSellerPhone} → ${normalizedSellerPhone}, Country: ${sellerProfile.country}`);
            console.log(`📦 [Accept Order] Receiver: ${receiverName}, Phone: ${rawReceiverPhone} → ${normalizedReceiverPhone}, Country: ${order.destination_country}`);
            console.log(`📦 [Accept Order] Terminal: ${order.destination_terminal_id || '(empty)'}, Parcel Size: ${order.parcel_size || 'M'}`);

            const labelResult = await generateShippingLabel({
              orderId,
              orderNumber: order.order_number,
              senderName: sellerProfile.full_name,
              senderPhone: normalizedSellerPhone,
              senderCountry: sellerProfile.country as 'LT' | 'LV' | 'EE',
              receiverName,
              receiverPhone: normalizedReceiverPhone,
              receiverCountry: order.destination_country as 'LT' | 'LV' | 'EE',
              destinationTerminalId: order.destination_terminal_id || '',
              parcelSize: (order.parcel_size || 'M') as 'XS' | 'S' | 'M' | 'L',
            });

            trackingNumber = labelResult.barcode;
            trackingUrl = labelResult.trackingUrl;

            console.log(`✅ [Accept Order] Label generated successfully: ParcelId ${labelResult.parcelId}`);

            // Update order with Unisend tracking data (uses service role to bypass RLS)
            const updateResult = await updateOrderWithShippingData(orderId, {
              parcelId: labelResult.parcelId,
              barcode: labelResult.barcode,
              trackingUrl: labelResult.trackingUrl,
              labelUrl: labelResult.labelUrl,
            });

            if (!updateResult.success) {
              console.error(`❌ [Accept Order] Failed to save shipping data:`, updateResult.error);
              labelError = `Label generated but failed to save: ${updateResult.error}`;
            }

            // Send shipping notification email to seller with parcelId
            // Seller will print the label at the Unisend terminal
            sendShippingLabelToSeller({
              sellerName: sellerProfile.full_name,
              sellerEmail: sellerProfile.email,
              orderNumber: order.order_number,
              orderId,
              buyerName: buyerProfile.full_name,
              destinationTerminalName: order.destination_terminal_name || '',
              destinationTerminalAddress: order.destination_terminal_address || '',
              parcelId: String(labelResult.parcelId),
              barcode: labelResult.barcode,
              trackingUrl: labelResult.trackingUrl,
            }).catch((err) => {
              console.error('❌ [Accept Order] Failed to send shipping email:', err);
            });
          } catch (error) {
            console.error('❌ [Accept Order] Label generation failed:', error);

            labelError = formatLabelError(error);
            if (error instanceof UnisendValidationError) {
              console.error('❌ [Accept Order] Validation errors:', error.validationErrors);
            }

            // Store the detailed error in the database (uses service role to bypass RLS)
            await updateOrderLabelError(orderId, labelError);
          }
        }

        // Send acceptance email to buyer
        const destinationInfo =
          order.shipping_method === 't2t'
            ? order.destination_terminal_name || ''
            : order.pickup_city || '';

        sendOrderAcceptedToBuyer({
          buyerName: buyerProfile.full_name,
          buyerEmail: buyerProfile.email,
          orderNumber: order.order_number,
          orderId: orderId,
          sellerName: sellerProfile.full_name,
          shippingMethod: (order.shipping_method || 't2t') as 'local_pickup' | 't2t',
          destinationInfo,
          trackingNumber,
          trackingUrl,
        }).catch(() => {});
      }
    }

    // Check label generation status for T2T orders
    let labelGenerated = false;
    let labelErrorResult: string | null = null;

    if (order?.shipping_method === 't2t') {
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('label_url, label_error')
        .eq('id', orderId)
        .single();

      const orderData = updatedOrder as { label_url: string | null; label_error: string | null } | null;
      labelGenerated = !!orderData?.label_url;
      labelErrorResult = orderData?.label_error || null;
    }

    // Post system message now that labelGenerated is known (non-blocking)
    postOrderAcceptedMessage(
      orderId,
      (result.shipping_method || 't2t') as 't2t' | 'local_pickup',
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
