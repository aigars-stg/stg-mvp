import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendOrderCancelledToBuyer } from '@/lib/email/send-order-emails';
import { stripe } from '@/lib/stripe';

interface DeclineOrderBody {
  reason?: string;
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
        { error: 'You must be signed in to decline orders' },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const body: DeclineOrderBody = await request.json();
    const { reason } = body;

    console.log(`❌ [Seller] User ${user.id} declining order ${orderId}`);

    // Call database function to decline order
    const { data: result, error: declineError } = await (supabase as any).rpc(
      'seller_decline_order',
      {
        p_order_id: orderId,
        p_seller_id: user.id,
        p_reason: reason || 'Seller declined',
      }
    );

    if (declineError) {
      console.error('❌ [Seller] Error declining order:', declineError);
      return NextResponse.json(
        { error: 'Failed to decline order', details: declineError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.error('❌ [Seller] Decline order failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log(`✅ [Seller] Order ${orderId} declined`);

    // Process refund if required
    if (result.requires_refund && result.payment_intent_id) {
      try {
        console.log(`💰 [Seller] Processing refund for ${result.payment_intent_id}`);

        const refund = await stripe.refunds.create({
          payment_intent: result.payment_intent_id,
          reason: 'requested_by_customer', // Closest match to seller decline
        });

        console.log(`✅ [Seller] Refund created: ${refund.id}`);

        // Update order with refund info
        await supabase
          .from('orders')
          .update({
            refunded_at: new Date().toISOString(),
            refund_amount: result.refund_amount,
          })
          .eq('id', orderId);
      } catch (refundError: any) {
        console.error('❌ [Seller] Refund failed:', refundError);
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
        }).catch((err) => console.error('Failed to send cancellation email:', err));

        console.log(`📧 [Seller] Sending cancellation email to buyer...`);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      refunded: result.requires_refund,
      refundAmount: result.refund_amount,
      message: 'Order declined and buyer refunded',
    });
  } catch (error: any) {
    console.error('❌ [Seller] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to decline order', details: error.message },
      { status: 500 }
    );
  }
}
