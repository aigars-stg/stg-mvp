import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendOrderAcceptedToBuyer, sendShippingLabelToSeller } from '@/lib/email/send-order-emails';
import { generateShippingLabel, getLabelPdfBuffer } from '@/lib/unisend/label-service';
import { postOrderAcceptedMessage } from '@/lib/transactions';

interface AcceptOrderBody {
  parcelSize?: 'XS' | 'S' | 'M' | 'L'; // Required for T2T orders
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
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to accept orders' },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const body: AcceptOrderBody = await request.json();
    const { parcelSize } = body;

    console.log(`📦 [Seller] User ${user.id} accepting order ${orderId}`);

    // Validate parcel size for T2T orders
    // We'll check shipping method after fetching the order

    // Call database function to accept order
    const { data: result, error: acceptError } = await (supabase as any).rpc(
      'seller_accept_order',
      {
        p_order_id: orderId,
        p_seller_id: user.id,
        p_parcel_size: parcelSize || null,
      }
    );

    if (acceptError) {
      console.error('❌ [Seller] Error accepting order:', acceptError);
      return NextResponse.json(
        { error: 'Failed to accept order', details: acceptError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.error('❌ [Seller] Accept order failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log(`✅ [Seller] Order ${orderId} accepted`);

    // Post system message to transaction conversation (non-blocking)
    postOrderAcceptedMessage(orderId, result.shipping_method || 't2t');

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
        parcel_size
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

        // For T2T orders, generate Unisend shipping label
        if (order.shipping_method === 't2t') {
          try {
            console.log(`📦 [Unisend] Generating shipping label for order ${order.order_number}...`);

            const labelResult = await generateShippingLabel({
              orderId,
              orderNumber: order.order_number,
              senderName: sellerProfile.full_name,
              senderPhone: sellerProfile.phone,
              senderCountry: sellerProfile.country as 'LT' | 'LV' | 'EE',
              receiverName: buyerProfile.full_name,
              receiverPhone: buyerProfile.phone,
              receiverCountry: order.destination_country as 'LT' | 'LV' | 'EE',
              destinationTerminalId: order.destination_terminal_id,
              parcelSize: order.parcel_size as 'XS' | 'S' | 'M' | 'L',
            });

            trackingNumber = labelResult.barcode;
            trackingUrl = labelResult.trackingUrl;

            console.log(`✅ [Unisend] Label generated: ${labelResult.barcode}`);

            // Update order with Unisend tracking data
            const { error: updateError } = await supabase
              .from('orders')
              .update({
                unisend_parcel_id: labelResult.parcelId,
                barcode: labelResult.barcode,
                tracking_url: labelResult.trackingUrl,
                label_url: labelResult.labelUrl,
                label_generated_at: new Date().toISOString(),
              })
              .eq('id', orderId);

            if (updateError) {
              console.error('❌ [Unisend] Failed to update order with tracking data:', updateError);
            }

            // Get label PDF for email attachment
            const labelPdfBuffer = await getLabelPdfBuffer(labelResult.labelUrl);

            // Send label email to seller
            sendShippingLabelToSeller({
              sellerName: sellerProfile.full_name,
              sellerEmail: sellerProfile.email,
              orderNumber: order.order_number,
              orderId,
              buyerName: buyerProfile.full_name,
              destinationTerminalName: order.destination_terminal_name || '',
              destinationTerminalAddress: order.destination_terminal_address || '',
              barcode: labelResult.barcode,
              trackingUrl: labelResult.trackingUrl,
              labelPdfBuffer,
            }).catch((err) => console.error('Failed to send label email to seller:', err));

            console.log(`📧 [Unisend] Sending shipping label to seller...`);
          } catch (labelError: any) {
            console.error('❌ [Unisend] Failed to generate shipping label:', labelError);
            // Don't fail the entire request - order is already accepted
            // Seller can still be notified to handle shipping manually
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
          shippingMethod: order.shipping_method,
          destinationInfo,
          trackingNumber,
          trackingUrl,
        }).catch((err) => console.error('Failed to send buyer email:', err));

        console.log(`📧 [Seller] Sending acceptance email to buyer...`);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      shippingMethod: result.shipping_method,
      message: 'Order accepted successfully',
    });
  } catch (error: any) {
    console.error('❌ [Seller] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to accept order', details: error.message },
      { status: 500 }
    );
  }
}
