import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPaymentStatus, voidPayment, refundPayment } from '@/lib/everypay/client';
import { SUCCESSFUL_STATES, FAILED_STATES } from '@/lib/everypay/types';
import { classifyPaymentError } from '@/lib/everypay/classify-error';
import { determineReleaseAction } from '@/lib/services/payment-capture';
import { postOrderCreatedMessage } from '@/lib/transactions';
import { sendOrderEmails } from '@/lib/email/send-order-emails';
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

    // 2. Already processed? Redirect to order page (idempotent)
    if (checkoutEvent.processed_at) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('everypay_payment_reference', paymentReference)
        .single();

      if (existingOrder) {
        return NextResponse.redirect(
          `${appUrl}/orders/${existingOrder.order_number}?welcome=true`
        );
      }
      // Already processed but order not found — payment may have failed
      return NextResponse.redirect(
        `${appUrl}/checkout/success?error=payment_failed`
      );
    }

    // 3. Verify payment status with EveryPay
    const paymentStatus = await getPaymentStatus(paymentReference);

    log.info(
      {
        paymentReference,
        paymentState: paymentStatus.payment_state,
        orderReference: checkoutEvent.order_reference,
        amount: paymentStatus.amount,
        currency: paymentStatus.currency,
        ...(paymentStatus.error && { everypayError: paymentStatus.error }),
      },
      'EveryPay payment status received'
    );

    if (SUCCESSFUL_STATES.has(paymentStatus.payment_state)) {
      // 4. Verify payment amount matches expected charge
      const metadata = checkoutEvent.payload as Record<string, unknown>;
      const expectedChargeCents = metadata.everypay_charge_cents as number | undefined;
      if (expectedChargeCents != null && paymentStatus.amount) {
        const returnedCents = Math.round(parseFloat(paymentStatus.amount) * 100);
        if (returnedCents !== expectedChargeCents) {
          log.error(
            { paymentReference, expectedChargeCents, returnedCents, amount: paymentStatus.amount },
            'EveryPay amount mismatch — possible tampering or race condition'
          );
          Sentry.captureMessage('EveryPay amount mismatch', {
            level: 'error',
            extra: { paymentReference, expectedChargeCents, returnedCents },
          });
          return NextResponse.redirect(
            `${appUrl}/checkout/success?error=amount_mismatch`
          );
        }
      }

      // 5. Create order based on type
      const orderRef = checkoutEvent.order_reference as string;
      const actualPaymentState = paymentStatus.payment_state;

      // Detect payment method: cc_details present = card, absent = bank link
      const walletDebitCents = (metadata.wallet_debit_cents as number) || 0;
      const hasCard = !!paymentStatus.cc_details?.last_four_digits;
      const detectedPaymentMethod = walletDebitCents > 0
        ? 'mixed'
        : (hasCard ? 'card' : 'bank_link');

      let orderResult: { orderId: string; orderNumber: string };

      // Determine checkout type from metadata (new) or order_reference prefix (legacy fallback)
      const checkoutType = metadata.checkout_type as string | undefined;
      const preGeneratedOrderNumber = metadata.order_number as string | undefined;
      const isBasket = checkoutType === 'basket' || (!checkoutType && orderRef.startsWith('BASKET-'));
      const isAuction = checkoutType === 'auction' || (!checkoutType && orderRef.startsWith('AUCTION-'));

      try {
        if (isBasket) {
          orderResult = await processBasketPayment(supabase, metadata, paymentReference, actualPaymentState, detectedPaymentMethod, preGeneratedOrderNumber);
        } else if (isAuction) {
          orderResult = await processAuctionPayment(supabase, metadata, paymentReference, actualPaymentState, detectedPaymentMethod, preGeneratedOrderNumber);
        } else {
          log.error({ orderRef }, 'Unknown order_reference type');
          return NextResponse.redirect(
            `${appUrl}/checkout/success?error=unknown_type`
          );
        }
      } catch (orderError) {
        // Order creation failed — auto-refund the EveryPay charge to avoid orphaned money
        log.error({ orderError, paymentReference }, 'Order creation failed after successful payment — initiating auto-refund');
        Sentry.captureException(orderError, {
          tags: { action: 'order_creation_failed' },
          extra: { paymentReference, orderRef, paymentState: actualPaymentState },
        });

        const refundAmountCents = Math.round(parseFloat(paymentStatus.amount || '0') * 100);
        try {
          const releaseAction = determineReleaseAction(actualPaymentState, paymentReference, 1);
          if (releaseAction === 'void') {
            try {
              await voidPayment(paymentReference);
              log.info({ paymentReference }, 'Auto-voided EveryPay payment after order creation failure');
            } catch {
              await refundPayment(paymentReference, refundAmountCents);
              log.info({ paymentReference }, 'Auto-refunded EveryPay payment after order creation failure (void failed)');
            }
          } else {
            await refundPayment(paymentReference, refundAmountCents);
            log.info({ paymentReference }, 'Auto-refunded EveryPay payment after order creation failure');
          }
        } catch (refundError) {
          log.error({ refundError, paymentReference }, 'Auto-refund ALSO failed — manual intervention needed');
          Sentry.captureException(refundError, {
            tags: { action: 'auto_refund_failed', critical: 'true' },
            extra: { paymentReference, amount: paymentStatus.amount },
          });
        }

        // Mark event as failed so it won't be retried
        await supabase
          .from('everypay_webhook_events')
          .update({
            processed_at: new Date().toISOString(),
            event_type: 'order_creation_failed',
            payload: {
              ...metadata,
              payment_state: actualPaymentState,
              order_error: orderError instanceof Error ? orderError.message : String(orderError),
            },
          })
          .eq('id', checkoutEvent.id);

        // Build redirect with retry context
        const failParams = new URLSearchParams({ error: 'order_creation_failed' });
        if (isBasket) {
          const basketId = metadata.basket_id as string;
          if (basketId) failParams.set('basket_id', basketId);
        }

        return NextResponse.redirect(
          `${appUrl}/checkout/success?${failParams.toString()}`
        );
      }

      // 6. Mark event as processed
      await supabase
        .from('everypay_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
          event_type: 'payment_completed',
          payload: { ...metadata, payment_state: paymentStatus.payment_state },
        })
        .eq('id', checkoutEvent.id);

      // 7. Post system message and send emails (non-blocking)
      postOrderCreatedMessage(orderResult.orderId);
      sendOrderEmails(supabase, orderResult.orderId, {
        buyerId: metadata.buyer_id as string,
        sellerId: metadata.seller_id as string,
      }).catch((err) =>
        log.error({ err, orderId: orderResult.orderId }, 'Email sending failed')
      );

      return NextResponse.redirect(
        `${appUrl}/orders/${orderResult.orderNumber}?welcome=true`
      );
    }

    if (FAILED_STATES.has(paymentStatus.payment_state)) {
      const errorCategory = classifyPaymentError(
        paymentStatus.payment_state,
        paymentStatus.error
      );

      log.warn(
        {
          paymentReference,
          paymentState: paymentStatus.payment_state,
          orderReference: checkoutEvent.order_reference,
          errorCategory,
          ...(paymentStatus.error && { everypayError: paymentStatus.error }),
          ...(paymentStatus.cc_details && { cardType: paymentStatus.cc_details.type, lastFour: paymentStatus.cc_details.last_four_digits }),
        },
        'Payment failed at EveryPay'
      );

      // Mark as failed — include EveryPay error details for debugging
      await supabase
        .from('everypay_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
          event_type: 'payment_failed',
          payload: {
            ...(checkoutEvent.payload as Record<string, unknown>),
            payment_state: paymentStatus.payment_state,
            error_category: errorCategory,
            ...(paymentStatus.error && { everypay_error: paymentStatus.error }),
            ...(paymentStatus.cc_details && { cc_type: paymentStatus.cc_details.type, cc_last_four: paymentStatus.cc_details.last_four_digits }),
          },
        })
        .eq('id', checkoutEvent.id);

      // Determine checkout type from metadata or legacy prefix
      const failedMetadata = checkoutEvent.payload as Record<string, unknown>;
      const failedOrderRef = checkoutEvent.order_reference as string;
      const failedCheckoutType = failedMetadata.checkout_type as string | undefined;
      const failedIsBasket = failedCheckoutType === 'basket' || (!failedCheckoutType && failedOrderRef.startsWith('BASKET-'));
      const failedIsAuction = failedCheckoutType === 'auction' || (!failedCheckoutType && failedOrderRef.startsWith('AUCTION-'));

      // Release auction listing reservation on payment failure
      if (failedIsAuction) {
        const listingId = failedMetadata.listing_id as string;
        if (listingId) {
          await supabase
            .from('listings')
            .update({ reserved_by: null })
            .eq('id', listingId);
          log.info({ listingId }, 'Released auction listing reservation after payment failure');
        }
      }

      // Basket orders: redirect back to checkout form so the error shows inline
      // Auction orders: redirect to success page (no checkout form to return to)
      if (failedIsBasket) {
        const checkoutParams = new URLSearchParams({ error: errorCategory });
        if (failedMetadata.basket_id) {
          checkoutParams.set('basket', failedMetadata.basket_id as string);
        }
        return NextResponse.redirect(
          `${appUrl}/checkout?${checkoutParams.toString()}`
        );
      }

      return NextResponse.redirect(
        `${appUrl}/checkout/success?error=${errorCategory}`
      );
    }

    // Still pending (3DS, processing, etc.) — redirect with session_id to trigger polling
    return NextResponse.redirect(
      `${appUrl}/checkout/success?session_id=${paymentReference}`
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
  paymentReference: string,
  paymentState: string,
  paymentMethod: string,
  preGeneratedOrderNumber?: string
): Promise<{ orderId: string; orderNumber: string }> {
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
    p_order_number: preGeneratedOrderNumber || null,
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
      everypay_payment_state: paymentState,
      payment_method: paymentMethod,
      commission_net_cents: (metadata.commission_net_cents as number) || null,
      commission_vat_cents: (metadata.commission_vat_cents as number) || null,
      commission_vat_rate: (metadata.commission_vat_rate as number) || null,
      shipping_net_cents: (metadata.shipping_net_cents as number) || null,
      shipping_vat_cents: (metadata.shipping_vat_cents as number) || null,
      shipping_vat_rate: (metadata.shipping_vat_rate as number) || null,
    })
    .eq('id', orderId);

  const orderNumber = result.order_number as string;
  log.info({ orderNumber, orderId, paymentMethod }, 'Basket order created');

  // Notify seller about new order (non-blocking)
  supabase.from('notifications').insert({
    user_id: metadata.seller_id as string,
    type: 'new_order',
    title: `New order ${orderNumber}`,
    body: 'Respond within 24 hours to confirm this order.',
    data: { order_id: orderId },
  }).then(({ error: notifError }) => {
    if (notifError) log.error({ notifError, orderId }, 'Failed to create seller notification');
  });

  return { orderId, orderNumber };
}

// ==============================================
// AUCTION ORDER CREATION
// ==============================================

async function processAuctionPayment(
  supabase: AdminClient,
  metadata: Record<string, unknown>,
  paymentReference: string,
  paymentState: string,
  paymentMethod: string,
  preGeneratedOrderNumber?: string
): Promise<{ orderId: string; orderNumber: string }> {
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
    p_order_number: preGeneratedOrderNumber || null,
  });

  if (error) {
    log.error({ error, listingId }, 'Auction order creation failed');
    throw new Error(`Auction order creation failed: ${error.message}`);
  }

  if (!result.success) {
    log.error({ error: result.error, listingId }, 'Auction order creation failed');
    throw new Error(`Auction order creation failed: ${result.error}`);
  }

  // Store actual payment state and VAT breakdown
  await supabase
    .from('orders')
    .update({
      everypay_payment_state: paymentState,
      payment_method: paymentMethod,
      commission_net_cents: (metadata.commission_net_cents as number) || null,
      commission_vat_cents: (metadata.commission_vat_cents as number) || null,
      commission_vat_rate: (metadata.commission_vat_rate as number) || null,
      shipping_net_cents: (metadata.shipping_net_cents as number) || null,
      shipping_vat_cents: (metadata.shipping_vat_cents as number) || null,
      shipping_vat_rate: (metadata.shipping_vat_rate as number) || null,
    })
    .eq('id', result.order_id);

  log.info({ orderId: result.order_id, orderNumber: result.order_number, listingId, paymentState, paymentMethod }, 'Auction order created');

  // Notify seller about new order (non-blocking)
  supabase.from('notifications').insert({
    user_id: metadata.seller_id as string,
    type: 'new_order',
    title: `New order ${result.order_number}`,
    body: 'Respond within 24 hours to confirm this order.',
    data: { order_id: result.order_id },
  }).then(({ error: notifError }) => {
    if (notifError) log.error({ notifError, orderId: result.order_id }, 'Failed to create seller notification');
  });

  return { orderId: result.order_id as string, orderNumber: result.order_number as string };
}

