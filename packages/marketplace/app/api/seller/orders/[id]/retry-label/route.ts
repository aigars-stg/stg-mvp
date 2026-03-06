import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { prepareAndGenerateLabel } from '@/lib/unisend/prepare-and-generate-label';

/**
 * POST /api/seller/orders/[id]/retry-label
 *
 * Retry generating shipping label for a T2T order.
 * Only works for accepted orders that don't have a label yet.
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

    if (labelResult.labelGenerated) {
      return NextResponse.json({
        success: true,
        orderId,
        parcelId: labelResult.parcelId,
        barcode: labelResult.barcode,
        trackingUrl: labelResult.trackingUrl,
        labelUrl: labelResult.labelUrl,
        message: 'Parcel registered successfully. Go to any Unisend terminal to print your label.',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Label generation failed',
        details: labelResult.labelError,
      },
      { status: 500 }
    );
  } catch (error) {
    return handleApiError(error, 'Retry label generation');
  }
}
