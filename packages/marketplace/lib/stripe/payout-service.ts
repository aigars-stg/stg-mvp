/**
 * Stripe Payout Service
 * Handles transferring funds to sellers via Stripe Connect
 * SERVER-ONLY: This file should only be imported in API routes
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PayoutResult {
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
}

/**
 * Transfer payout to seller for a completed order
 */
export async function transferPayoutToSeller(orderId: string): Promise<PayoutResult> {
  try {
    console.log(`💸 [Payout] Processing payout for order ${orderId}`);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        seller_id,
        items_total,
        shipping_cost,
        service_fee,
        status,
        payout_status,
        stripe_payment_intent_id
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ [Payout] Order not found:', orderError);
      return { success: false, error: 'Order not found' };
    }

    // Validate order status
    if (order.status !== 'completed') {
      console.log(`⏭️ [Payout] Order ${order.order_number} not completed yet (${order.status})`);
      return { success: false, error: 'Order not completed' };
    }

    // Check if already paid out
    if (order.payout_status === 'completed') {
      console.log(`✅ [Payout] Order ${order.order_number} already paid out`);
      return { success: true };
    }

    // Get seller's Connect account from seller_profiles
    const { data: seller, error: sellerError } = await supabase
      .from('seller_profiles')
      .select(`
        user_id,
        stripe_connect_account_id,
        stripe_connect_payouts_enabled
      `)
      .eq('user_id', order.seller_id)
      .single();

    if (sellerError || !seller) {
      console.error('❌ [Payout] Seller not found:', sellerError);
      return { success: false, error: 'Seller not found' };
    }

    // Check if seller can receive payouts
    if (!seller.stripe_connect_account_id || !seller.stripe_connect_payouts_enabled) {
      console.log(`⏭️ [Payout] Seller ${seller.user_id} cannot receive payouts yet`);

      // Update payout status to on_hold
      await supabase
        .from('orders')
        .update({ payout_status: 'on_hold' })
        .eq('id', orderId);

      return { success: false, error: 'Seller payout account not ready' };
    }

    // Calculate payout amount
    // Seller receives items_total only (platform keeps shipping + service fee via Stripe application_fee)
    const grossAmount = order.items_total;
    const platformFee = order.service_fee + order.shipping_cost;
    const netAmount = grossAmount;

    console.log(`💸 [Payout] Seller receives: €${grossAmount}, Platform keeps: €${platformFee} (fee + shipping)`);

    // Mark as processing
    await supabase
      .from('orders')
      .update({ payout_status: 'processing' })
      .eq('id', orderId);

    // Create payout transaction record
    const { data: payoutTx, error: txError } = await supabase
      .from('payout_transactions')
      .insert({
        order_id: orderId,
        seller_id: order.seller_id,
        stripe_connect_account_id: seller.stripe_connect_account_id,
        gross_amount: grossAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: 'processing',
      })
      .select()
      .single();

    if (txError) {
      console.error('❌ [Payout] Failed to create transaction record:', txError);
      return { success: false, error: 'Failed to create transaction record' };
    }

    // Create Stripe Transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'eur',
        destination: seller.stripe_connect_account_id,
        description: `Payout for order ${order.order_number}`,
        metadata: {
          order_id: orderId,
          order_number: order.order_number,
          seller_id: order.seller_id,
          payout_transaction_id: payoutTx.id,
        },
      });

      console.log(`✅ [Payout] Transfer created: ${transfer.id} for €${netAmount}`);

      // Update order
      await supabase
        .from('orders')
        .update({
          stripe_transfer_id: transfer.id,
          stripe_transfer_amount: netAmount,
          transferred_to_seller_at: new Date().toISOString(),
          payout_status: 'completed',
        })
        .eq('id', orderId);

      // Update transaction record
      await supabase
        .from('payout_transactions')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payoutTx.id);

      return {
        success: true,
        transferId: transfer.id,
        amount: netAmount,
      };
    } catch (stripeError: unknown) {
      console.error('❌ [Payout] Stripe transfer failed:', stripeError);

      // Update order
      await supabase
        .from('orders')
        .update({ payout_status: 'failed' })
        .eq('id', orderId);

      // Extract error details from Stripe error
      const isStripeError = stripeError && typeof stripeError === 'object' && 'type' in stripeError;
      const errorCode = isStripeError && 'code' in stripeError ? String(stripeError.code) : undefined;
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown error';

      // Update transaction record
      await supabase
        .from('payout_transactions')
        .update({
          status: 'failed',
          error_code: errorCode,
          error_message: errorMessage,
        })
        .eq('id', payoutTx.id);

      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error: unknown) {
    console.error('❌ [Payout] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process all pending payouts (called by cron or admin)
 */
export async function processAllPendingPayouts(): Promise<{
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  results: Array<{ orderId: string; orderNumber: string; success: boolean; amount?: number; error?: string }>;
}> {
  console.log(`💸 [Payout] Processing all pending payouts...`);

  // Get all completed orders awaiting payout
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('status', 'completed')
    .eq('payout_status', 'pending');

  if (error || !orders) {
    console.error('❌ [Payout] Failed to fetch orders:', error);
    return { totalProcessed: 0, successCount: 0, errorCount: 0, results: [] };
  }

  console.log(`💸 [Payout] Found ${orders.length} orders awaiting payout`);

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const order of orders) {
    const result = await transferPayoutToSeller(order.id);

    results.push({
      orderId: order.id,
      orderNumber: order.order_number,
      success: result.success,
      amount: result.amount,
      error: result.error,
    });

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ [Payout] Batch complete: ${successCount} success, ${errorCount} errors`);

  return {
    totalProcessed: orders.length,
    successCount,
    errorCount,
    results,
  };
}

// ============================================
// BANK PAYOUT FUNCTIONS (Balance → Bank)
// ============================================

interface BankPayoutResult {
  success: boolean;
  payoutId?: string;
  amount?: number;
  arrivalDate?: string;
  error?: string;
}

const MINIMUM_PAYOUT_AMOUNT = 500; // €5.00 in cents

/**
 * Request a bank payout from seller's Stripe balance to their bank account
 */
export async function requestBankPayout(
  userId: string,
  amountInCents?: number // If not provided, payout full available balance
): Promise<BankPayoutResult> {
  try {
    console.log(`🏦 [Bank Payout] Processing bank payout for user ${userId}`);

    // Get seller profile
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select(`
        stripe_connect_account_id,
        stripe_connect_payouts_enabled,
        has_bank_account,
        bank_account_last4,
        bank_account_bank_name
      `)
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'User profile not found' };
    }

    if (!profile.stripe_connect_account_id) {
      return { success: false, error: 'No Stripe Connect account' };
    }

    if (!profile.stripe_connect_payouts_enabled) {
      return { success: false, error: 'Payouts not enabled' };
    }

    if (!profile.has_bank_account) {
      return { success: false, error: 'No bank account connected' };
    }

    // Get available balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: profile.stripe_connect_account_id,
    });

    const eurAvailable = balance.available.find((b) => b.currency === 'eur');
    const availableAmount = eurAvailable?.amount || 0;

    if (availableAmount < MINIMUM_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Minimum payout is €${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}. Available: €${(availableAmount / 100).toFixed(2)}`,
      };
    }

    // Determine payout amount
    const payoutAmount = amountInCents
      ? Math.min(amountInCents, availableAmount)
      : availableAmount;

    if (payoutAmount < MINIMUM_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Minimum payout is €${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}`,
      };
    }

    console.log(`🏦 [Bank Payout] Creating payout of €${(payoutAmount / 100).toFixed(2)}`);

    // Create payout on connected account
    const payout = await stripe.payouts.create(
      {
        amount: payoutAmount,
        currency: 'eur',
        metadata: {
          user_id: userId,
        },
      },
      {
        stripeAccount: profile.stripe_connect_account_id,
      }
    );

    console.log(`✅ [Bank Payout] Payout created: ${payout.id}`);

    // Calculate arrival date
    const arrivalDate = payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0]
      : null;

    // Record in database
    const { error: insertError } = await supabase.from('seller_payouts').insert({
      user_id: userId,
      stripe_payout_id: payout.id,
      stripe_connect_account_id: profile.stripe_connect_account_id,
      amount: payoutAmount / 100, // Store as decimal
      currency: 'eur',
      status: payout.status,
      bank_account_last4: profile.bank_account_last4,
      bank_name: profile.bank_account_bank_name,
      arrival_date: arrivalDate,
    });

    if (insertError) {
      console.error('❌ [Bank Payout] Failed to record payout:', insertError);
      // Don't fail - payout was already created in Stripe
    }

    return {
      success: true,
      payoutId: payout.id,
      amount: payoutAmount,
      arrivalDate: arrivalDate || undefined,
    };
  } catch (error: unknown) {
    console.error('❌ [Bank Payout] Error:', error);

    // Handle specific Stripe errors
    const isStripeError = error && typeof error === 'object' && 'type' in error;
    if (isStripeError && error.type === 'StripeInvalidRequestError') {
      if ('code' in error && error.code === 'balance_insufficient') {
        return { success: false, error: 'Insufficient balance for payout' };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payout',
    };
  }
}

/**
 * Get seller's bank payout history
 */
export async function getSellerBankPayouts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    bankLast4: string | null;
    bankName: string | null;
    arrivalDate: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
  total: number;
}> {
  // Get total count
  const { count } = await supabase
    .from('seller_payouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get payouts
  const { data: payouts, error } = await supabase
    .from('seller_payouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !payouts) {
    return { payouts: [], total: 0 };
  }

  return {
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: parseFloat(p.amount),
      currency: p.currency,
      status: p.status,
      bankLast4: p.bank_account_last4,
      bankName: p.bank_name,
      arrivalDate: p.arrival_date,
      paidAt: p.paid_at,
      createdAt: p.created_at,
    })),
    total: count || 0,
  };
}
