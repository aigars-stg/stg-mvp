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

import type { SupabaseClient } from '@supabase/supabase-js';
import { createPayment as createEveryPayPayment } from '@/lib/everypay/client';
import { calculateCheckoutPricingFromEuros, calculateOrderPricing } from './pricing';
import { getWalletBalance } from './wallet';

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

  const orderPricing = calculateOrderPricing(
    pricing.itemsTotalCents,
    pricing.shippingCostCents
  );

  // 2. Build RPC params (only params the RPC accepts)
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
  };

  // 3. Wallet-only payment (no EveryPay needed)
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
        platform_commission_cents: orderPricing.commissionCents,
        seller_wallet_credit_cents: orderPricing.walletCreditCents,
      })
      .eq('id', orderId);

    return {
      type: 'wallet_only',
      orderId,
      redirect: `${appUrl}/checkout/success?order_id=${orderId}`,
    };
  }

  // 4. EveryPay payment (full or partial with wallet)
  const orderReference = `BASKET_${basketId}`;
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
          basket_id: basketId,
          buyer_id: buyerId,
          seller_id: sellerId,
          wallet_debit_cents: pricing.walletDebitCents,
          platform_commission_cents: orderPricing.commissionCents,
          seller_wallet_credit_cents: orderPricing.walletCreditCents,
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
    return { type: 'error', error: message, status: 502 };
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

  const orderPricing = calculateOrderPricing(
    pricing.itemsTotalCents,
    pricing.shippingCostCents
  );

  // 2. For auctions, we don't use create_order_from_basket.
  //    The webhook handler will create the order directly.
  const orderReference = `AUCTION_${listingId}`;

  if (pricing.everypayChargeCents === 0) {
    // Wallet-only: create auction order immediately
    // TODO: Create a dedicated RPC for auction orders, or use direct insert
    // For now, create the order directly via insert
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        order_number: `A-${Date.now()}`,
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
        buyer_wallet_debit_cents: pricing.walletDebitCents,
        platform_commission_cents: orderPricing.commissionCents,
        seller_wallet_credit_cents: orderPricing.walletCreditCents,
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
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        wallet_debit_cents: pricing.walletDebitCents,
        platform_commission_cents: orderPricing.commissionCents,
        seller_wallet_credit_cents: orderPricing.walletCreditCents,
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
    return { type: 'error', error: message, status: 502 };
  }
}
