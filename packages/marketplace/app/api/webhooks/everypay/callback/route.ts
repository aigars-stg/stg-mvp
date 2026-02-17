import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPaymentStatus } from '@/lib/everypay/client';
import { SUCCESSFUL_STATES, FAILED_STATES } from '@/lib/everypay/types';
import { postOrderCreatedMessage } from '@/lib/transactions';
import * as Sentry from '@sentry/nextjs';
import { loggers } from '@/lib/logger';

const log = loggers.payments;

// Use generic SupabaseClient type (untyped) for dynamic webhook operations
type AdminClient = SupabaseClient;

/**
 * GET /api/webhooks/everypay/callback
 *
 * EveryPay redirects the customer here after payment.
 * We verify the payment status, create the order, and redirect to success/failure.
 *
 * Query params from EveryPay:
 *   - payment_reference: EveryPay's reference for this payment
 *   - order_reference: Our reference (BASKET-xxx or AUCTION-xxx)
 *
 * Query params we appended to customer_url:
 *   - basket_id (for basket checkouts)
 *   - listing_id + type=auction (for auction checkouts)
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const searchParams = request.nextUrl.searchParams;
  const paymentReference = searchParams.get('payment_reference');

  if (!paymentReference) {
    log.error('Missing payment_reference');
    return NextResponse.redirect(
      `${appUrl}/checkout/success?error=missing_reference`
    );
  }

  const supabase: AdminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Look up the checkout_initiated event
    const { data: checkoutEvent, error: lookupError } = await supabase
      .from('everypay_webhook_events')
      .select('*')
      .eq('payment_reference', paymentReference)
      .eq('event_type', 'checkout_initiated')
      .single();

    if (lookupError || !checkoutEvent) {
      log.error({ paymentReference }, 'Unknown payment_reference');
      return NextResponse.redirect(
        `${appUrl}/checkout/success?error=unknown_payment`
      );
    }

    // 2. Already processed? Redirect to success (idempotent)
    if (checkoutEvent.processed_at) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('everypay_payment_reference', paymentReference)
        .single();

      if (existingOrder) {
        return NextResponse.redirect(
          `${appUrl}/checkout/success?order_id=${existingOrder.id}`
        );
      }
      // Already processed but order not found — payment may have failed
      return NextResponse.redirect(
        `${appUrl}/checkout/success?error=payment_failed`
      );
    }

    // 3. Verify payment status with EveryPay
    const paymentStatus = await getPaymentStatus(paymentReference);

    if (SUCCESSFUL_STATES.has(paymentStatus.payment_state)) {
      // 4. Create order based on type
      const metadata = checkoutEvent.payload as Record<string, unknown>;
      const orderRef = checkoutEvent.order_reference as string;

      let orderId: string;

      if (orderRef.startsWith('BASKET-')) {
        orderId = await processBasketPayment(supabase, metadata, paymentReference);
      } else if (orderRef.startsWith('AUCTION-')) {
        orderId = await processAuctionPayment(supabase, metadata, paymentReference);
      } else {
        log.error({ orderRef }, 'Unknown order_reference type');
        return NextResponse.redirect(
          `${appUrl}/checkout/success?error=unknown_type`
        );
      }

      // 5. Mark event as processed
      await supabase
        .from('everypay_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
          event_type: 'payment_completed',
          payload: { ...metadata, payment_state: paymentStatus.payment_state },
        })
        .eq('id', checkoutEvent.id);

      // 6. Post system message and send emails (non-blocking)
      postOrderCreatedMessage(orderId);
      sendOrderEmails(supabase, orderId, metadata).catch((err) =>
        log.error({ err, orderId }, 'Email sending failed')
      );

      return NextResponse.redirect(
        `${appUrl}/checkout/success?order_id=${orderId}`
      );
    }

    if (FAILED_STATES.has(paymentStatus.payment_state)) {
      // Mark as failed
      await supabase
        .from('everypay_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
          event_type: 'payment_failed',
          payload: {
            ...(checkoutEvent.payload as Record<string, unknown>),
            payment_state: paymentStatus.payment_state,
          },
        })
        .eq('id', checkoutEvent.id);

      return NextResponse.redirect(
        `${appUrl}/checkout/success?error=payment_failed`
      );
    }

    // Still pending (3DS, processing, etc.) — redirect with pending indicator
    return NextResponse.redirect(
      `${appUrl}/checkout/success?payment_reference=${paymentReference}&pending=true`
    );
  } catch (error) {
    log.error({ error }, 'EveryPay callback failed');
    Sentry.captureException(error, { tags: { action: 'EveryPay callback' } });
    return NextResponse.redirect(
      `${appUrl}/checkout/success?error=verification_failed`
    );
  }
}

// ==============================================
// BASKET ORDER CREATION
// ==============================================

async function processBasketPayment(
  supabase: AdminClient,
  metadata: Record<string, unknown>,
  paymentReference: string
): Promise<string> {
  const basketId = metadata.basket_id as string;
  const shippingMethod = metadata.shipping_method as string;
  const shippingCost = metadata.shipping_cost as number;
  const walletDebitCents = (metadata.wallet_debit_cents as number) || 0;
  const commissionCents = (metadata.platform_commission_cents as number) || 0;
  const walletCreditCents = (metadata.seller_wallet_credit_cents as number) || 0;
  const locale = (metadata.locale as string) || 'en';

  // Call the RPC to create the order atomically
  const { data: result, error } = await supabase.rpc('create_order_from_basket', {
    p_basket_id: basketId,
    p_shipping_method: shippingMethod,
    p_destination_country: metadata.destination_country || null,
    p_destination_terminal_id: metadata.destination_terminal_id || null,
    p_destination_terminal_name: metadata.destination_terminal_name || null,
    p_destination_terminal_address: metadata.destination_terminal_address || null,
    p_receiver_name: metadata.receiver_name || null,
    p_receiver_phone: metadata.receiver_phone || null,
    p_receiver_email: metadata.receiver_email || null,
    p_pickup_city: metadata.pickup_city || null,
    p_pickup_notes: metadata.pickup_notes || null,
    p_shipping_cost: shippingCost,
    p_everypay_payment_reference: paymentReference,
    p_buyer_wallet_debit_cents: walletDebitCents,
  });

  if (error) {
    log.error({ error, basketId }, 'Basket order creation failed');
    throw new Error(`Order creation failed: ${error.message}`);
  }

  if (!result.success) {
    log.error({ error: result.error, basketId }, 'Basket order creation failed');
    throw new Error(`Order creation failed: ${result.error}`);
  }

  const orderId = result.order_id as string;

  // Update order with fields the RPC doesn't handle
  await supabase
    .from('orders')
    .update({
      locale,
      platform_commission_cents: commissionCents,
      seller_wallet_credit_cents: walletCreditCents,
      everypay_payment_state: 'settled',
    })
    .eq('id', orderId);

  log.info({ orderNumber: result.order_number, orderId }, 'Basket order created');

  return orderId;
}

// ==============================================
// AUCTION ORDER CREATION
// ==============================================

async function processAuctionPayment(
  supabase: AdminClient,
  metadata: Record<string, unknown>,
  paymentReference: string
): Promise<string> {
  const listingId = metadata.listing_id as string;
  const buyerId = metadata.buyer_id as string;
  const sellerId = metadata.seller_id as string;
  const shippingMethod = metadata.shipping_method as string;
  const winningBidEuros = metadata.winning_bid_euros as number;
  const shippingCost = metadata.shipping_cost as number;
  const walletDebitCents = (metadata.wallet_debit_cents as number) || 0;
  const commissionCents = (metadata.platform_commission_cents as number) || 0;
  const walletCreditCents = (metadata.seller_wallet_credit_cents as number) || 0;
  const locale = (metadata.locale as string) || 'en';

  // Call the RPC to create the auction order atomically
  const { data: result, error } = await supabase.rpc('create_order_from_auction', {
    p_listing_id: listingId,
    p_buyer_id: buyerId,
    p_seller_id: sellerId,
    p_shipping_method: shippingMethod,
    p_destination_country: (metadata.destination_country as string) || null,
    p_destination_terminal_id: (metadata.destination_terminal_id as string) || null,
    p_destination_terminal_name: (metadata.destination_terminal_name as string) || null,
    p_destination_terminal_address: (metadata.destination_terminal_address as string) || null,
    p_receiver_name: (metadata.receiver_name as string) || null,
    p_receiver_phone: (metadata.receiver_phone as string) || null,
    p_receiver_email: (metadata.receiver_email as string) || null,
    p_pickup_city: (metadata.pickup_city as string) || null,
    p_pickup_notes: (metadata.pickup_notes as string) || null,
    p_winning_bid_euros: winningBidEuros,
    p_shipping_cost: shippingCost,
    p_everypay_payment_reference: paymentReference,
    p_buyer_wallet_debit_cents: walletDebitCents,
    p_platform_commission_cents: commissionCents,
    p_seller_wallet_credit_cents: walletCreditCents,
    p_locale: locale,
  });

  if (error) {
    log.error({ error, listingId }, 'Auction order creation failed');
    throw new Error(`Auction order creation failed: ${error.message}`);
  }

  if (!result.success) {
    log.error({ error: result.error, listingId }, 'Auction order creation failed');
    throw new Error(`Auction order creation failed: ${result.error}`);
  }

  log.info({ orderId: result.order_id, orderNumber: result.order_number, listingId }, 'Auction order created');

  return result.order_id as string;
}

// ==============================================
// EMAIL NOTIFICATIONS
// ==============================================

async function sendOrderEmails(
  supabase: AdminClient,
  orderId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const buyerId = metadata.buyer_id as string;
  const sellerId = metadata.seller_id as string;

  // Fetch profiles
  const [{ data: buyerProfile }, { data: sellerProfile }, { data: order }] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', buyerId)
        .single(),
      supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', sellerId)
        .single(),
      supabase
        .from('orders')
        .select('order_number, shipping_method, destination_terminal_name, pickup_city, total_amount, order_items(id)')
        .eq('id', orderId)
        .single(),
    ]);

  if (!buyerProfile || !sellerProfile || !order) return;

  const emailData = {
    orderNumber: order.order_number,
    orderId,
    sellerName: sellerProfile.full_name,
    sellerEmail: sellerProfile.email,
    buyerName: buyerProfile.full_name,
    buyerEmail: buyerProfile.email,
    itemCount: order.order_items?.length || 1,
    totalAmount: order.total_amount,
    shippingMethod: order.shipping_method as 't2t' | 'local_pickup',
    destinationInfo:
      order.shipping_method === 't2t'
        ? order.destination_terminal_name || ''
        : order.pickup_city || '',
  };

  const { sendOrderPlacedToSeller, sendOrderConfirmationToBuyer } =
    await import('@/lib/email/send-order-emails');

  await Promise.allSettled([
    sendOrderPlacedToSeller(emailData),
    sendOrderConfirmationToBuyer(emailData),
  ]);
}
