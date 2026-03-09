/**
 * Checkout service
 *
 * Orchestrates the payment flow:
 *   1. Calculate pricing (items + shipping, no service fee)
 *   2. Check buyer wallet balance
 *   3. If wallet covers total → debit wallet, create order immediately
 *   4. If wallet < total → debit wallet portion pending, create EveryPay payment for remainder
 *   5. If wallet = 0 → full EveryPay payment
 *
 * Order creation happens either immediately (wallet-only) or after EveryPay callback.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createPayment as createEveryPayPayment } from '@/lib/everypay/client';
import { calculateCheckoutPricingFromEuros, calculateOrderPricingWithVat } from './pricing';
import { getWalletBalance } from './wallet';
import { sendOrderEmails } from '@/lib/email/send-order-emails';
import { loggers } from '@/lib/logger';

const log = loggers.payments;

// ==============================================
// TYPES
// ==============================================

export interface CheckoutInput {
  basketId: string;
  buyerId: string;
  sellerId: string;
  shippingMethod: 't2t' | 'local_pickup';
  itemsTotalEuros: number;
  shippingCostEuros: number;
  locale: string;
  buyerEmail?: string;
  customerIp?: string;

  // T2T fields
  destinationCountry?: string;
  destinationTerminalId?: string;
  destinationTerminalName?: string;
  destinationTerminalAddress?: string;
  senderCountry?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverEmail?: string;

  // Local pickup fields
  pickupCity?: string;
  pickupNotes?: string;

  // Wallet preference
  useWallet: boolean;
}

export interface AuctionCheckoutInput {
  listingId: string;
  buyerId: string;
  sellerId: string;
  shippingMethod: 't2t' | 'local_pickup';
  winningBidEuros: number;
  shippingCostEuros: number;
  gameName: string;
  locale: string;
  buyerEmail?: string;
  customerIp?: string;

  // T2T fields
  senderCountry?: string;
  destinationCountry?: string;
  destinationTerminalId?: string;
  destinationTerminalName?: string;
  destinationTerminalAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverEmail?: string;

  // Local pickup fields
  pickupCity?: string;
  pickupNotes?: string;

  // Wallet preference
  useWallet: boolean;
}

export type CheckoutResult =
  | { type: 'wallet_only'; orderId: string; redirect: string }
  | { type: 'everypay'; paymentLink: string; paymentReference: string }
  | { type: 'error'; error: string; status: number };

// ---------------------------------------------------------------------------
// Seller notification helper (uses service role for cross-user insert)
// ---------------------------------------------------------------------------

async function notifySellerNewOrder(
  sellerId: string,
  orderId: string,
  orderNumber: string
): Promise<void> {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await adminSupabase.from('notifications').insert({
    user_id: sellerId,
    type: 'new_order',
    title: `New order ${orderNumber}`,
    body: 'Respond within 24 hours to confirm this order.',
    data: { order_id: orderId },
  });
  if (error) {
    console.error('Failed to create seller notification:', error);
  }
}

// ==============================================
// HELPERS
// ==============================================

async function generateOrderNumber(
  supabase: SupabaseClient
): Promise<string | CheckoutResult> {
  const { data, error } = await supabase.rpc('generate_order_number');
  if (error || !data) {
    log.error({ err: error }, 'Failed to generate order number');
    return { type: 'error', error: 'Failed to generate order number', status: 500 };
  }
  return data;
}

// ==============================================
// BASKET CHECKOUT
// ==============================================

/**
 * Create a checkout session for a basket.
 * If wallet covers the full amount, creates the order immediately.
 * Otherwise, creates an EveryPay payment for the remainder.
 */
export async function createCheckoutSession(
  supabase: SupabaseClient,
  input: CheckoutInput,
  appUrl: string
): Promise<CheckoutResult> {
  const {
    basketId,
    buyerId,
    sellerId,
    shippingMethod,
    itemsTotalEuros,
    shippingCostEuros,
    useWallet,
    locale,
    buyerEmail,
    customerIp,
  } = input;

  // 1. Calculate pricing
  const walletBalance = useWallet
    ? (await getWalletBalance(supabase, buyerId)).balanceCents
    : 0;

  const pricing = calculateCheckoutPricingFromEuros(
    itemsTotalEuros,
    shippingCostEuros,
    walletBalance
  );

  const orderPricing = calculateOrderPricingWithVat(
    pricing.itemsTotalCents,
    pricing.shippingCostCents,
    input.senderCountry
  );

  // 2. Generate order number upfront (STG-YYYY-NNNNNN)
  const orderNumberResult = await generateOrderNumber(supabase);
  if (typeof orderNumberResult !== 'string') return orderNumberResult;
  const orderNumber = orderNumberResult;

  // 3. Build RPC params
  const rpcParams = {
    p_basket_id: basketId,
    p_shipping_method: shippingMethod,
    p_destination_country: input.destinationCountry || null,
    p_destination_terminal_id: input.destinationTerminalId || null,
    p_destination_terminal_name: input.destinationTerminalName || null,
    p_destination_terminal_address: input.destinationTerminalAddress || null,
    p_receiver_name: input.receiverName || null,
    p_receiver_phone: input.receiverPhone || null,
    p_receiver_email: input.receiverEmail || null,
    p_pickup_city: input.pickupCity || null,
    p_pickup_notes: input.pickupNotes || null,
    p_shipping_cost: shippingCostEuros,
    p_everypay_payment_reference: null as string | null,
    p_buyer_wallet_debit_cents: pricing.walletDebitCents,
    p_order_number: orderNumber,
  };

  // 4. Wallet-only payment (no EveryPay needed)
  if (pricing.everypayChargeCents === 0) {
    const { data: result, error } = await supabase.rpc(
      'create_order_from_basket',
      rpcParams
    );

    if (error) {
      console.error('Order creation failed:', error);
      return { type: 'error', error: 'Failed to create order', status: 500 };
    }

    if (!result.success) {
      console.error('Order creation failed:', result.error);
      return { type: 'error', error: result.error || 'Order creation failed', status: 400 };
    }

    const orderId = result.order_id;

    // Update order with fields the RPC doesn't handle
    await supabase
      .from('orders')
      .update({
        locale,
        payment_method: 'wallet_only',
        platform_commission_cents: orderPricing.commissionCents,
        seller_wallet_credit_cents: orderPricing.walletCreditCents,
        commission_net_cents: orderPricing.commissionVat.netCents,
        commission_vat_cents: orderPricing.commissionVat.vatCents,
        commission_vat_rate: orderPricing.commissionVat.vatRate,
        shipping_net_cents: orderPricing.shippingVat.netCents,
        shipping_vat_cents: orderPricing.shippingVat.vatCents,
        shipping_vat_rate: orderPricing.shippingVat.vatRate,
      })
      .eq('id', orderId);

    // Notify seller about new order (non-blocking)
    notifySellerNewOrder(sellerId, orderId, result.order_number).catch(() => {});

    // Send buyer confirmation and seller notification emails (non-blocking)
    sendOrderEmails(supabase, orderId, {
      buyerId,
      sellerId,
    }).catch((err) =>
      log.error({ err, orderId }, 'Wallet checkout: email sending failed')
    );

    return {
      type: 'wallet_only',
      orderId,
      redirect: `${appUrl}/checkout/success?order_id=${orderId}`,
    };
  }

  // 5. EveryPay payment (full or partial with wallet)
  // Each checkout attempt gets a fresh order number, so no uniqueness collision
  const orderReference = orderNumber;
  const customerUrl = `${appUrl}/api/webhooks/everypay/callback?basket_id=${basketId}`;

  try {
    const payment = await createEveryPayPayment(
      pricing.everypayChargeCents,
      orderReference,
      customerUrl,
      { locale, email: buyerEmail, customerIp }
    );

    // Store checkout metadata in everypay_webhook_events so the callback
    // handler can complete the order after payment verification.
    const { error: metaError } = await supabase
      .from('everypay_webhook_events')
      .insert({
        payment_reference: payment.payment_reference,
        order_reference: orderReference,
        event_type: 'checkout_initiated',
        payload: {
          checkout_type: 'basket',
          order_number: orderNumber,
          basket_id: basketId,
          buyer_id: buyerId,
          seller_id: sellerId,
          wallet_debit_cents: pricing.walletDebitCents,
          platform_commission_cents: orderPricing.commissionCents,
          seller_wallet_credit_cents: orderPricing.walletCreditCents,
          commission_net_cents: orderPricing.commissionVat.netCents,
          commission_vat_cents: orderPricing.commissionVat.vatCents,
          commission_vat_rate: orderPricing.commissionVat.vatRate,
          shipping_net_cents: orderPricing.shippingVat.netCents,
          shipping_vat_cents: orderPricing.shippingVat.vatCents,
          shipping_vat_rate: orderPricing.shippingVat.vatRate,
          shipping_method: shippingMethod,
          shipping_cost: shippingCostEuros,
          destination_country: input.destinationCountry || null,
          destination_terminal_id: input.destinationTerminalId || null,
          destination_terminal_name: input.destinationTerminalName || null,
          destination_terminal_address: input.destinationTerminalAddress || null,
          receiver_name: input.receiverName || null,
          receiver_phone: input.receiverPhone || null,
          receiver_email: input.receiverEmail || null,
          pickup_city: input.pickupCity || null,
          pickup_notes: input.pickupNotes || null,
          locale,
        },
        processed_at: null,
      });

    if (metaError) {
      console.error('Failed to store checkout metadata:', metaError);
      // Non-fatal — but callback handler won't be able to complete the order
    }

    return {
      type: 'everypay',
      paymentLink: payment.payment_link!,
      paymentReference: payment.payment_reference,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'EveryPay payment creation failed';
    console.error('EveryPay createPayment failed:', message);
    return { type: 'error', error: message, status: 422 };
  }
}

// ==============================================
// AUCTION CHECKOUT
// ==============================================

/**
 * Create a checkout session for an auction winner.
 * Same wallet+EveryPay logic as basket checkout but for a single auction item.
 */
export async function createAuctionCheckoutSession(
  supabase: SupabaseClient,
  input: AuctionCheckoutInput,
  appUrl: string
): Promise<CheckoutResult> {
  const {
    listingId,
    buyerId,
    sellerId,
    shippingMethod,
    winningBidEuros,
    shippingCostEuros,
    useWallet,
    locale,
    buyerEmail,
    customerIp,
  } = input;

  // 1. Calculate pricing
  const walletBalance = useWallet
    ? (await getWalletBalance(supabase, buyerId)).balanceCents
    : 0;

  const pricing = calculateCheckoutPricingFromEuros(
    winningBidEuros,
    shippingCostEuros,
    walletBalance
  );

  const orderPricing = calculateOrderPricingWithVat(
    pricing.itemsTotalCents,
    pricing.shippingCostCents,
    input.senderCountry
  );

  // 2. Generate order number upfront (STG-YYYY-NNNNNN)
  const orderNumberResult = await generateOrderNumber(supabase);
  if (typeof orderNumberResult !== 'string') return orderNumberResult;
  const orderNumber = orderNumberResult;

  // Each checkout attempt gets a fresh order number, so no uniqueness collision
  const orderReference = orderNumber;

  if (pricing.everypayChargeCents === 0) {
    // Wallet-only: create auction order immediately
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        order_number: orderNumber,
        shipping_method: shippingMethod,
        destination_country: input.destinationCountry || null,
        destination_terminal_id: input.destinationTerminalId || null,
        destination_terminal_name: input.destinationTerminalName || null,
        destination_terminal_address: input.destinationTerminalAddress || null,
        receiver_name: input.receiverName || null,
        receiver_phone: input.receiverPhone || null,
        receiver_email: input.receiverEmail || null,
        pickup_city: input.pickupCity || null,
        pickup_notes: input.pickupNotes || null,
        items_total: winningBidEuros,
        shipping_cost: shippingCostEuros,
        total_amount: winningBidEuros + shippingCostEuros,
        status: 'pending_seller',
        paid_at: new Date().toISOString(),
        locale,
        payment_method: 'wallet_only',
        buyer_wallet_debit_cents: pricing.walletDebitCents,
        platform_commission_cents: orderPricing.commissionCents,
        seller_wallet_credit_cents: orderPricing.walletCreditCents,
        commission_net_cents: orderPricing.commissionVat.netCents,
        commission_vat_cents: orderPricing.commissionVat.vatCents,
        commission_vat_rate: orderPricing.commissionVat.vatRate,
        shipping_net_cents: orderPricing.shippingVat.netCents,
        shipping_vat_cents: orderPricing.shippingVat.vatCents,
        shipping_vat_rate: orderPricing.shippingVat.vatRate,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Auction order creation failed:', error);
      return { type: 'error', error: 'Failed to create order', status: 500 };
    }

    // Debit wallet
    if (pricing.walletDebitCents > 0) {
      await (supabase.rpc as (...args: unknown[]) => ReturnType<typeof supabase.rpc>)('debit_buyer_wallet', {
        p_user_id: buyerId,
        p_amount_cents: pricing.walletDebitCents,
        p_order_id: order.id,
      });
    }

    // Mark listing as sold
    await supabase
      .from('listings')
      .update({ status: 'sold', sold_at: new Date().toISOString() })
      .eq('id', listingId);

    // Create order item
    await supabase.from('order_items').insert({
      order_id: order.id,
      listing_id: listingId,
      game_name: input.gameName,
      price: winningBidEuros,
    });

    // Notify seller about new order (non-blocking)
    notifySellerNewOrder(sellerId, order.id, orderNumber).catch(() => {});

    // Send buyer confirmation and seller notification emails (non-blocking)
    sendOrderEmails(supabase, order.id, {
      buyerId,
      sellerId,
    }).catch((err) =>
      log.error({ err, orderId: order.id }, 'Wallet auction checkout: email sending failed')
    );

    return {
      type: 'wallet_only',
      orderId: order.id,
      redirect: `${appUrl}/checkout/success?order_id=${order.id}&type=auction`,
    };
  }

  // EveryPay payment
  const customerUrl = `${appUrl}/api/webhooks/everypay/callback?listing_id=${listingId}&type=auction`;

  try {
    const payment = await createEveryPayPayment(
      pricing.everypayChargeCents,
      orderReference,
      customerUrl,
      { locale, email: buyerEmail, customerIp }
    );

    // Store checkout metadata for callback handler
    await supabase.from('everypay_webhook_events').insert({
      payment_reference: payment.payment_reference,
      order_reference: orderReference,
      event_type: 'checkout_initiated',
      payload: {
        checkout_type: 'auction',
        order_number: orderNumber,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        wallet_debit_cents: pricing.walletDebitCents,
        platform_commission_cents: orderPricing.commissionCents,
        seller_wallet_credit_cents: orderPricing.walletCreditCents,
        commission_net_cents: orderPricing.commissionVat.netCents,
        commission_vat_cents: orderPricing.commissionVat.vatCents,
        commission_vat_rate: orderPricing.commissionVat.vatRate,
        shipping_net_cents: orderPricing.shippingVat.netCents,
        shipping_vat_cents: orderPricing.shippingVat.vatCents,
        shipping_vat_rate: orderPricing.shippingVat.vatRate,
        winning_bid_euros: winningBidEuros,
        shipping_method: shippingMethod,
        shipping_cost: shippingCostEuros,
        game_name: input.gameName,
        destination_country: input.destinationCountry || null,
        destination_terminal_id: input.destinationTerminalId || null,
        destination_terminal_name: input.destinationTerminalName || null,
        destination_terminal_address: input.destinationTerminalAddress || null,
        receiver_name: input.receiverName || null,
        receiver_phone: input.receiverPhone || null,
        receiver_email: input.receiverEmail || null,
        pickup_city: input.pickupCity || null,
        pickup_notes: input.pickupNotes || null,
        locale,
      },
      processed_at: null,
    });

    // Reserve listing to prevent other buyers
    await supabase
      .from('listings')
      .update({ reserved_by: buyerId })
      .eq('id', listingId);

    return {
      type: 'everypay',
      paymentLink: payment.payment_link!,
      paymentReference: payment.payment_reference,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'EveryPay payment creation failed';
    console.error('EveryPay createPayment failed:', message);
    return { type: 'error', error: message, status: 422 };
  }
}
