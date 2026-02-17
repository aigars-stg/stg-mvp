import { NextRequest, NextResponse } from 'next/server';
import { sendShippingLabelToSeller } from '@/lib/email/send-order-emails';
import { generateShippingLabel, updateOrderWithShippingData, updateOrderLabelError } from '@/lib/unisend/label-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { UnisendValidationError } from '@/lib/unisend/types';
import { formatLabelError } from '@/lib/unisend/format-label-error';

/**
 * POST /api/seller/orders/[id]/retry-label
 *
 * Retry generating shipping label for a T2T order
 * Only works for accepted orders that don't have a label yet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.id;

    // Fetch order details (including receiver info from checkout)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        shipping_method,
        destination_terminal_name,
        destination_terminal_id,
        destination_terminal_address,
        destination_country,
        parcel_size,
        label_url,
        receiver_name,
        receiver_phone,
        receiver_email
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify seller owns this order
    if (order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify order is in correct state
    if (order.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Order must be accepted to generate label' },
        { status: 400 }
      );
    }

    // Verify it's a T2T order
    if (order.shipping_method !== 't2t') {
      return NextResponse.json(
        { error: 'Labels are only generated for Terminal-to-Terminal orders' },
        { status: 400 }
      );
    }

    // Check if label already exists
    if (order.label_url) {
      return NextResponse.json(
        { error: 'Label already exists', labelUrl: order.label_url },
        { status: 400 }
      );
    }

    // Fetch buyer and seller profiles
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

    if (!buyerProfile || !sellerProfile) {
      return NextResponse.json(
        { error: 'Could not find user profiles' },
        { status: 500 }
      );
    }

    // Use receiver info from order (provided during checkout) with fallback to buyer profile
    const receiverName = order.receiver_name || buyerProfile.full_name;
    const receiverPhone = order.receiver_phone || buyerProfile.phone || '';

    // Log attempt
    console.log(`🔄 [Retry Label] Retrying label generation for order ${orderId}...`);
    console.log(`📦 [Retry Label] Sender: ${sellerProfile.full_name}, Phone: ${sellerProfile.phone || '(empty)'}, Country: ${sellerProfile.country || 'LT'}`);
    console.log(`📦 [Retry Label] Receiver: ${receiverName}, Phone: ${receiverPhone || '(empty)'}, Country: ${order.destination_country || 'LT'}`);
    console.log(`📦 [Retry Label] Terminal: ${order.destination_terminal_id || '(empty)'}, Parcel Size: ${order.parcel_size || 'M'}`);

    try {
      const labelResult = await generateShippingLabel({
        orderId,
        orderNumber: order.order_number,
        senderName: sellerProfile.full_name,
        senderPhone: sellerProfile.phone || '',
        senderCountry: (sellerProfile.country || 'LT') as 'LT' | 'LV' | 'EE',
        receiverName,
        receiverPhone,
        receiverCountry: (order.destination_country || 'LT') as 'LT' | 'LV' | 'EE',
        destinationTerminalId: order.destination_terminal_id || '',
        parcelSize: (order.parcel_size || 'M') as 'XS' | 'S' | 'M' | 'L',
      });

      console.log(`✅ [Retry Label] Label generated successfully: ParcelId ${labelResult.parcelId}`);

      // Update order with Unisend tracking data (uses service role to bypass RLS)
      const updateResult = await updateOrderWithShippingData(orderId, {
        parcelId: labelResult.parcelId,
        barcode: labelResult.barcode,
        trackingUrl: labelResult.trackingUrl,
        labelUrl: labelResult.labelUrl,
      });

      if (!updateResult.success) {
        console.error(`❌ [Retry Label] Failed to save shipping data:`, updateResult.error);
        return NextResponse.json(
          { error: 'Label generated but failed to save to database', details: updateResult.error },
          { status: 500 }
        );
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
        console.error('❌ [Retry Label] Failed to send shipping email:', err);
      });

      return NextResponse.json({
        success: true,
        orderId,
        parcelId: labelResult.parcelId,
        barcode: labelResult.barcode,
        trackingUrl: labelResult.trackingUrl,
        labelUrl: labelResult.labelUrl,
        message: 'Parcel registered successfully. Go to any Unisend terminal to print your label.',
      });
    } catch (error) {
      console.error('❌ [Retry Label] Label generation failed:', error);

      const errorMessage = formatLabelError(error);
      if (error instanceof UnisendValidationError) {
        console.error('❌ [Retry Label] Validation errors:', error.validationErrors);
      }

      // Store the detailed error in the database (uses service role to bypass RLS)
      await updateOrderLabelError(orderId, errorMessage);

      return NextResponse.json(
        {
          success: false,
          error: 'Label generation failed',
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error, 'Retry label generation');
  }
}
