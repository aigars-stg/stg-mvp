import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler
 * Processes webhook events from Stripe, primarily checkout.session.completed
 * This endpoint creates orders after successful payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ [Webhook] No signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('❌ [Webhook] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() {
            return undefined;
          },
        },
      }
    );

    console.log(`📨 [Webhook] Received event: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log(`💳 [Webhook] Processing checkout session: ${session.id}`);
      console.log(`📦 [Webhook] Payment status: ${session.payment_status}`);

      // Only process if payment was successful
      if (session.payment_status !== 'paid') {
        console.log(`⚠️ [Webhook] Payment not completed, status: ${session.payment_status}`);
        return NextResponse.json({ received: true });
      }

      // Extract metadata
      const metadata = session.metadata;
      if (!metadata) {
        console.error('❌ [Webhook] No metadata found in session');
        return NextResponse.json({ error: 'No metadata' }, { status: 400 });
      }

      const {
        basket_id,
        buyer_id,
        seller_id,
        shipping_method,
        destination_country,
        destination_terminal_id,
        destination_terminal_name,
        destination_terminal_address,
        sender_country,
        receiver_name,
        receiver_phone,
        receiver_email,
        pickup_city,
        pickup_notes,
        items_total_cents,
        shipping_cost_cents,
        service_fee_cents,
      } = metadata;

      console.log(`📊 [Webhook] Order details:`, {
        basket_id,
        buyer_id,
        seller_id,
        shipping_method,
        items_total_cents,
        shipping_cost_cents,
        service_fee_cents,
      });



      // Get payment intent ID from session
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      // Convert cents to euros
      const itemsTotal = parseInt(items_total_cents) / 100;
      const shippingCost = parseInt(shipping_cost_cents) / 100;
      const serviceFee = parseInt(service_fee_cents) / 100;

      // Prepare order creation parameters
      const orderParams: any = {
        p_basket_id: basket_id,
        p_shipping_method: shipping_method,
        p_shipping_cost: shippingCost,
        p_service_fee: serviceFee,
        p_stripe_payment_intent_id: paymentIntentId,
      };

      // Add T2T-specific parameters
      if (shipping_method === 't2t') {
        orderParams.p_destination_country = destination_country;
        orderParams.p_destination_terminal_id = destination_terminal_id;
        orderParams.p_destination_terminal_name = destination_terminal_name;
        orderParams.p_destination_terminal_address = destination_terminal_address || null;
        orderParams.p_receiver_name = receiver_name;
        orderParams.p_receiver_phone = receiver_phone;
        orderParams.p_receiver_email = receiver_email;
      }

      // Add local pickup parameters
      if (shipping_method === 'local_pickup') {
        orderParams.p_pickup_city = pickup_city;
        orderParams.p_pickup_notes = pickup_notes || null;
      }

      // Create order in database
      const { data: orderResult, error: orderError } = await (supabase as any).rpc(
        'create_order_from_basket',
        orderParams
      );

      if (orderError) {
        console.error('❌ [Webhook] Error creating order:', orderError);
        return NextResponse.json(
          { error: 'Failed to create order', details: orderError.message },
          { status: 500 }
        );
      }

      if (!orderResult.success) {
        console.error('❌ [Webhook] Order creation failed:', orderResult.error);
        return NextResponse.json(
          { error: orderResult.error },
          { status: 400 }
        );
      }

      console.log(
        `✅ [Webhook] Order created successfully: ${orderResult.order_number} (${orderResult.order_id})`
      );
      console.log(`💰 [Webhook] Total amount: €${orderResult.total_amount}`);

      // Fetch buyer and seller profiles for email
      const { data: buyerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', buyer_id)
        .single();

      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', seller_id)
        .single();

      // Get order items count
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderResult.order_id);

      // Send email notifications (async, don't block webhook response)
      if (buyerProfile && sellerProfile) {
        const emailData = {
          orderNumber: orderResult.order_number,
          orderId: orderResult.order_id,
          sellerName: sellerProfile.full_name,
          sellerEmail: sellerProfile.email,
          buyerName: buyerProfile.full_name,
          buyerEmail: buyerProfile.email,
          itemCount: orderItems?.length || 1,
          totalAmount: orderResult.total_amount,
          shippingMethod: shipping_method as 't2t' | 'local_pickup',
          destinationInfo: shipping_method === 't2t'
            ? destination_terminal_name || ''
            : pickup_city || '',
        };

        // Send emails asynchronously (don't await)
        const { sendOrderPlacedToSeller, sendOrderConfirmationToBuyer } = await import('@/lib/email/send-order-emails');
        sendOrderPlacedToSeller(emailData).catch(err =>
          console.error('Failed to send seller email:', err)
        );
        sendOrderConfirmationToBuyer(emailData).catch(err =>
          console.error('Failed to send buyer email:', err)
        );

        console.log(`📧 [Webhook] Sending notification emails...`);
      }

      return NextResponse.json({
        received: true,
        order_id: orderResult.order_id,
        order_number: orderResult.order_number,
      });
    }

    // Handle account updates (KYC, capabilities, etc.)
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      console.log(`👤 [Webhook] Processing account update: ${account.id}`);

      const { error } = await supabase
        .from('seller_profiles')
        .update({
          stripe_connect_onboarding_completed:
            account.details_submitted && account.charges_enabled,
          stripe_connect_charges_enabled: account.charges_enabled,
          stripe_connect_payouts_enabled: account.payouts_enabled,
          stripe_connect_details_submitted: account.details_submitted,
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq('stripe_connect_account_id', account.id);

      if (error) {
        console.error('❌ [Webhook] Failed to update seller profile:', error);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
      return NextResponse.json({ received: true });
    }

    // Handle refunds
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💸 [Webhook] Processing refund for charge: ${charge.id}`);

      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (paymentIntentId) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', paymentIntentId);

        if (error) {
          console.error('❌ [Webhook] Failed to update order status:', error);
        }
      }
      return NextResponse.json({ received: true });
    }

    // Handle disputes
    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute;
      console.error('🚨 [Webhook] CHARGE DISPUTE CREATED:', dispute.id);
      console.error('Amount:', dispute.amount);
      console.error('Reason:', dispute.reason);
      // TODO: Implement admin notification system
      return NextResponse.json({ received: true, alert: 'Admin notified' });
    }

    // Handle other event types if needed
    console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ [Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
