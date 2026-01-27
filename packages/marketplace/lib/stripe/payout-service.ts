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
        stripe_payment_intent_id,
        stripe_charge_id
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
      // Create transfer with source_transaction to link to original charge
      // This prevents "insufficient funds" errors by tying funds together
      const transferParams: {
        amount: number;
        currency: string;
        destination: string;
        description: string;
        transfer_group?: string;
        source_transaction?: string;
        metadata: Record<string, string>;
      } = {
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
      };

      // Add source_transaction if we have the charge ID (recommended by Stripe)
      // This links the transfer to the original charge, preventing timing issues
      if (order.stripe_charge_id) {
        transferParams.source_transaction = order.stripe_charge_id;
        console.log(`💸 [Payout] Using source_transaction: ${order.stripe_charge_id}`);
      }

      const transfer = await stripe.transfers.create(transferParams);

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

      // Track balance activity for dormancy detection
      await updateBalanceActivity(order.seller_id);

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

    // Track balance activity for dormancy detection
    await updateBalanceActivity(userId);

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

// ============================================
// PAYOUT SETTINGS FUNCTIONS
// ============================================

export const PAYOUT_THRESHOLD_OPTIONS = [1000, 2000, 5000, 10000] as const; // in cents
export type PayoutThreshold = (typeof PAYOUT_THRESHOLD_OPTIONS)[number];

/**
 * Get seller's payout settings
 */
export async function getPayoutSettings(userId: string): Promise<{
  payoutThreshold: number;
  payoutType: 'auto' | 'manual';
} | null> {
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('payout_threshold, payout_type')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return {
    payoutThreshold: data.payout_threshold,
    payoutType: data.payout_type,
  };
}

/**
 * Update seller's payout settings
 */
export async function updatePayoutSettings(
  userId: string,
  settings: { payoutThreshold?: number; payoutType?: 'auto' | 'manual' }
): Promise<{ success: boolean; error?: string }> {
  const update: Record<string, unknown> = {};

  if (settings.payoutThreshold !== undefined) {
    if (!PAYOUT_THRESHOLD_OPTIONS.includes(settings.payoutThreshold as PayoutThreshold)) {
      return { success: false, error: 'Invalid payout threshold' };
    }
    update.payout_threshold = settings.payoutThreshold;
  }

  if (settings.payoutType !== undefined) {
    if (!['auto', 'manual'].includes(settings.payoutType)) {
      return { success: false, error: 'Invalid payout type' };
    }
    update.payout_type = settings.payoutType;
  }

  if (Object.keys(update).length === 0) {
    return { success: false, error: 'No settings to update' };
  }

  const { error } = await supabase
    .from('seller_profiles')
    .update(update)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ [Payout Settings] Update failed:', error);
    return { success: false, error: 'Failed to update settings' };
  }

  return { success: true };
}

/**
 * Update last_balance_activity_at for a seller
 * Call on: sale completion, payout request, transfer
 */
export async function updateBalanceActivity(userId: string): Promise<void> {
  await supabase
    .from('seller_profiles')
    .update({ last_balance_activity_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/**
 * Process auto-payouts for all eligible sellers
 * Called by weekly cron (Mondays 9:00 UTC)
 */
export async function processAutoPayouts(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ userId: string; amount?: number; success: boolean; error?: string }>;
}> {
  console.log('💸 [Auto-Payout] Starting weekly auto-payout run...');

  const { data: sellers, error } = await supabase
    .from('seller_profiles')
    .select('user_id, stripe_connect_account_id, payout_threshold')
    .eq('payout_type', 'auto')
    .eq('stripe_connect_payouts_enabled', true)
    .not('stripe_connect_account_id', 'is', null);

  if (error || !sellers) {
    console.error('❌ [Auto-Payout] Failed to fetch sellers:', error);
    return { processed: 0, succeeded: 0, failed: 0, results: [] };
  }

  console.log(`💸 [Auto-Payout] Checking ${sellers.length} sellers with auto-payout enabled`);

  let succeeded = 0;
  let failed = 0;
  const results: Array<{ userId: string; amount?: number; success: boolean; error?: string }> = [];

  for (const seller of sellers) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: seller.stripe_connect_account_id!,
      });

      const eurAvailable = balance.available.find((b: { currency: string }) => b.currency === 'eur');
      const availableAmount = eurAvailable?.amount || 0;

      if (availableAmount < seller.payout_threshold) {
        continue;
      }

      const payout = await stripe.payouts.create(
        {
          amount: availableAmount,
          currency: 'eur',
          metadata: { user_id: seller.user_id, type: 'auto' },
        },
        { stripeAccount: seller.stripe_connect_account_id! }
      );

      await supabase.from('seller_payouts').insert({
        user_id: seller.user_id,
        stripe_payout_id: payout.id,
        stripe_connect_account_id: seller.stripe_connect_account_id,
        amount: availableAmount / 100,
        currency: 'eur',
        status: payout.status,
        payout_type: 'auto',
        arrival_date: payout.arrival_date
          ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0]
          : null,
      });

      await updateBalanceActivity(seller.user_id);

      console.log(`✅ [Auto-Payout] Paid €${(availableAmount / 100).toFixed(2)} to ${seller.user_id}`);
      succeeded++;
      results.push({ userId: seller.user_id, amount: availableAmount, success: true });
    } catch (err) {
      console.error(`❌ [Auto-Payout] Failed for ${seller.user_id}:`, err);
      failed++;
      results.push({
        userId: seller.user_id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`✅ [Auto-Payout] Complete: ${succeeded} succeeded, ${failed} failed`);
  return { processed: succeeded + failed, succeeded, failed, results };
}

/**
 * Process dormancy payouts for sellers with 6+ months of inactivity
 * Called by monthly cron
 */
export async function processDormancyPayouts(): Promise<{
  warned: number;
  paidOut: number;
  results: Array<{ userId: string; action: 'warned' | 'paid_out' | 'error'; amount?: number }>;
}> {
  console.log('💤 [Dormancy] Starting dormancy check...');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const fiveMonthsAgo = new Date();
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

  // Phase 1: Warn sellers at 5 months dormancy (no warning sent yet)
  const { data: warnSellers } = await supabase
    .from('seller_profiles')
    .select('user_id, stripe_connect_account_id, last_balance_activity_at')
    .eq('stripe_connect_payouts_enabled', true)
    .not('stripe_connect_account_id', 'is', null)
    .lt('last_balance_activity_at', fiveMonthsAgo.toISOString())
    .gte('last_balance_activity_at', sixMonthsAgo.toISOString())
    .is('dormancy_warning_sent_at', null);

  let warned = 0;
  let paidOut = 0;
  const results: Array<{ userId: string; action: 'warned' | 'paid_out' | 'error'; amount?: number }> = [];

  if (warnSellers) {
    for (const seller of warnSellers) {
      await supabase
        .from('seller_profiles')
        .update({ dormancy_warning_sent_at: new Date().toISOString() })
        .eq('user_id', seller.user_id);
      // TODO: Send dormancy warning email
      warned++;
      results.push({ userId: seller.user_id, action: 'warned' });
    }
  }

  // Phase 2: Auto-payout sellers 6+ months dormant AND warned 1+ month ago
  const { data: dormantSellers } = await supabase
    .from('seller_profiles')
    .select('user_id, stripe_connect_account_id')
    .eq('stripe_connect_payouts_enabled', true)
    .not('stripe_connect_account_id', 'is', null)
    .lt('last_balance_activity_at', sixMonthsAgo.toISOString())
    .not('dormancy_warning_sent_at', 'is', null)
    .lt('dormancy_warning_sent_at', oneMonthAgo.toISOString());

  if (dormantSellers) {
    for (const seller of dormantSellers) {
      try {
        const balance = await stripe.balance.retrieve({
          stripeAccount: seller.stripe_connect_account_id!,
        });

        const eurAvailable = balance.available.find((b: { currency: string }) => b.currency === 'eur');
        const availableAmount = eurAvailable?.amount || 0;

        if (availableAmount <= 0) continue;

        const payout = await stripe.payouts.create(
          {
            amount: availableAmount,
            currency: 'eur',
            metadata: { user_id: seller.user_id, type: 'dormancy' },
          },
          { stripeAccount: seller.stripe_connect_account_id! }
        );

        await supabase.from('seller_payouts').insert({
          user_id: seller.user_id,
          stripe_payout_id: payout.id,
          stripe_connect_account_id: seller.stripe_connect_account_id,
          amount: availableAmount / 100,
          currency: 'eur',
          status: payout.status,
          payout_type: 'dormancy',
          arrival_date: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0]
            : null,
        });

        await supabase
          .from('seller_profiles')
          .update({
            last_balance_activity_at: new Date().toISOString(),
            dormancy_warning_sent_at: null,
          })
          .eq('user_id', seller.user_id);

        // TODO: Send dormancy payout notification email
        paidOut++;
        results.push({ userId: seller.user_id, action: 'paid_out', amount: availableAmount });
      } catch (err) {
        console.error(`❌ [Dormancy] Failed for ${seller.user_id}:`, err);
        results.push({ userId: seller.user_id, action: 'error' });
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`💤 [Dormancy] Complete: ${warned} warned, ${paidOut} paid out`);
  return { warned, paidOut, results };
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
