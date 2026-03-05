/**
 * Refund service
 * Handles pre-completion refunds (EveryPay + wallet portions)
 * Tracks refund status, method, and references for admin dashboard
 * Refunds are only allowed before order completion (before seller wallet is credited)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { refundToWallet } from './wallet';

/**
 * Create a refund adapter that wraps the EveryPay refundPayment API
 * into the callback signature expected by processRefund/processPartialRefund.
 */
export function createRefundAdapter(): (
  paymentRef: string,
  amountCents: number
) => Promise<{ success: boolean; reference?: string; error?: string }> {
  return async (ref, cents) => {
    const { refundPayment } = await import('@/lib/everypay/client');
    try {
      const result = await refundPayment(ref, cents);
      return { success: true, reference: result.payment_reference };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };
}

// Statuses that allow refunds (before seller wallet credit, plus disputed)
export const REFUNDABLE_STATUSES = [
  'pending_seller',
  'accepted',
  'shipped',
  'in_transit',
  'delivered',
  'disputed',
] as const;

export type RefundableStatus = (typeof REFUNDABLE_STATUSES)[number];

export interface RefundResult {
  success: boolean;
  walletRefundedCents: number;
  everypayRefundedCents: number;
  refundMethod?: string;
  requiresManualSepa?: boolean;
  error?: string;
}

export interface RefundAmounts {
  totalAmountCents: number;
  walletPortionCents: number;
  everypayPortionCents: number;
}

/**
 * Check if an order status allows refunds
 */
export function isRefundableStatus(status: string): status is RefundableStatus {
  return REFUNDABLE_STATUSES.includes(status as RefundableStatus);
}

/**
 * Calculate the wallet and EveryPay portions of a refund
 * total_amount is stored in euros (decimal), buyer_wallet_debit_cents in integer cents
 */
export function calculateRefundAmounts(
  totalAmountEuros: number,
  buyerWalletDebitCents: number | null | undefined
): RefundAmounts {
  const totalAmountCents = Math.round(totalAmountEuros * 100);
  const walletPortionCents = buyerWalletDebitCents || 0;
  const everypayPortionCents = totalAmountCents - walletPortionCents;

  return { totalAmountCents, walletPortionCents, everypayPortionCents };
}

/**
 * Determine the refund method based on payment method and refund split
 */
function determineRefundMethod(
  paymentMethod: string | null,
  walletPortionCents: number,
  everypayPortionCents: number
): string {
  if (everypayPortionCents === 0) return 'wallet_only';
  if (walletPortionCents === 0) {
    if (paymentMethod === 'bank_link') return 'everypay_bank_link';
    return 'everypay_card';
  }
  return 'mixed';
}

/**
 * Process a full refund for an order
 * - Refunds EveryPay portion via EveryPay API
 * - Refunds wallet portion back to buyer's wallet
 * - Tracks refund status and method
 * - Only allowed pre-completion
 */
export async function processRefund(
  supabase: SupabaseClient,
  orderId: string,
  refundEveryPay: (paymentRef: string, amountCents: number) => Promise<{ success: boolean; reference?: string; error?: string }>
): Promise<RefundResult> {
  // Fetch order details
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, total_amount, buyer_id, buyer_wallet_debit_cents, everypay_payment_reference, payment_method')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: 'Order not found' };
  }

  // Check if order is refundable
  if (!isRefundableStatus(order.status)) {
    return {
      success: false,
      walletRefundedCents: 0,
      everypayRefundedCents: 0,
      error: 'Order cannot be refunded after completion',
    };
  }

  const { walletPortionCents, everypayPortionCents } = calculateRefundAmounts(
    order.total_amount,
    order.buyer_wallet_debit_cents
  );

  const refundMethod = determineRefundMethod(order.payment_method, walletPortionCents, everypayPortionCents);

  // Mark refund as initiated
  await supabase
    .from('orders')
    .update({
      refund_status: 'processing',
      refund_method: refundMethod,
      refund_initiated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  let walletRefundedCents = 0;
  let everypayRefundedCents = 0;

  // Bank link payments: EveryPay marks as refunded but doesn't move money
  // Flag for manual SEPA transfer instead of calling EveryPay refund
  if (order.payment_method === 'bank_link' && everypayPortionCents > 0) {
    // Still call EveryPay to mark the payment as refunded in their system
    if (order.everypay_payment_reference) {
      try {
        const epResult = await refundEveryPay(order.everypay_payment_reference, everypayPortionCents);
        if (epResult.reference) {
          await supabase
            .from('orders')
            .update({ refund_everypay_reference: epResult.reference })
            .eq('id', orderId);
        }
      } catch {
        // Bank link refund API call is best-effort; SEPA is the real refund
      }
    }

    // Refund wallet portion if any
    if (walletPortionCents > 0) {
      const walletResult = await refundToWallet(supabase, order.buyer_id, walletPortionCents, orderId);
      if (walletResult.success) walletRefundedCents = walletPortionCents;
    }

    // Flag as manual SEPA required
    await supabase
      .from('orders')
      .update({
        status: 'refunded',
        refund_status: 'manual_sepa_required',
        refund_amount: order.total_amount,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return {
      success: true,
      walletRefundedCents,
      everypayRefundedCents: 0,
      refundMethod,
      requiresManualSepa: true,
    };
  }

  // Refund EveryPay portion (card payments)
  if (everypayPortionCents > 0 && order.everypay_payment_reference) {
    const epResult = await refundEveryPay(
      order.everypay_payment_reference,
      everypayPortionCents
    );
    if (!epResult.success) {
      await supabase
        .from('orders')
        .update({
          refund_status: 'failed',
          refund_error: epResult.error || 'EveryPay refund failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return {
        success: false,
        walletRefundedCents: 0,
        everypayRefundedCents: 0,
        error: `EveryPay refund failed: ${epResult.error}`,
      };
    }
    everypayRefundedCents = everypayPortionCents;

    if (epResult.reference) {
      await supabase
        .from('orders')
        .update({ refund_everypay_reference: epResult.reference })
        .eq('id', orderId);
    }
  }

  // Refund wallet portion
  if (walletPortionCents > 0) {
    const walletResult = await refundToWallet(
      supabase,
      order.buyer_id,
      walletPortionCents,
      orderId
    );
    if (!walletResult.success) {
      await supabase
        .from('orders')
        .update({
          refund_status: 'failed',
          refund_error: `Wallet refund failed: ${walletResult.error}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return {
        success: false,
        walletRefundedCents: 0,
        everypayRefundedCents,
        error: `Wallet refund failed: ${walletResult.error}`,
      };
    }
    walletRefundedCents = walletPortionCents;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'refunded',
      refund_status: refundMethod === 'everypay_card' ? 'processing' : 'completed',
      refund_amount: order.total_amount,
      refunded_at: new Date().toISOString(),
      refund_completed_at: refundMethod === 'wallet_only' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  return {
    success: true,
    walletRefundedCents,
    everypayRefundedCents,
    refundMethod,
  };
}

/**
 * Process a partial refund for a specific amount
 * Used for dispute resolutions with buyer_partial_refund
 */
export async function processPartialRefund(
  supabase: SupabaseClient,
  orderId: string,
  refundAmountCents: number,
  refundEveryPay: (paymentRef: string, amountCents: number) => Promise<{ success: boolean; reference?: string; error?: string }>
): Promise<RefundResult> {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, buyer_id, buyer_wallet_debit_cents, everypay_payment_reference, payment_method')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: 'Order not found' };
  }

  const walletDebitCents = order.buyer_wallet_debit_cents || 0;
  // Refund wallet portion first (up to what was debited), remainder from EveryPay
  const walletRefundCents = Math.min(refundAmountCents, walletDebitCents);
  const everypayRefundCents = refundAmountCents - walletRefundCents;

  const refundMethod = determineRefundMethod(order.payment_method, walletRefundCents, everypayRefundCents);

  // Mark refund as initiated
  await supabase
    .from('orders')
    .update({
      refund_status: 'processing',
      refund_method: refundMethod,
      refund_initiated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  let walletRefundedCents = 0;
  let everypayRefundedCents = 0;

  // Bank link: flag for manual SEPA
  if (order.payment_method === 'bank_link' && everypayRefundCents > 0) {
    if (walletRefundCents > 0) {
      const walletResult = await refundToWallet(supabase, order.buyer_id, walletRefundCents, orderId);
      if (walletResult.success) walletRefundedCents = walletRefundCents;
    }

    await supabase
      .from('orders')
      .update({
        refund_status: 'manual_sepa_required',
        refund_amount: refundAmountCents / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return { success: true, walletRefundedCents, everypayRefundedCents: 0, refundMethod, requiresManualSepa: true };
  }

  if (everypayRefundCents > 0 && order.everypay_payment_reference) {
    const epResult = await refundEveryPay(order.everypay_payment_reference, everypayRefundCents);
    if (!epResult.success) {
      await supabase
        .from('orders')
        .update({
          refund_status: 'failed',
          refund_error: epResult.error || 'EveryPay refund failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: `EveryPay refund failed: ${epResult.error}` };
    }
    everypayRefundedCents = everypayRefundCents;

    if (epResult.reference) {
      await supabase
        .from('orders')
        .update({ refund_everypay_reference: epResult.reference })
        .eq('id', orderId);
    }
  }

  if (walletRefundCents > 0) {
    const walletResult = await refundToWallet(supabase, order.buyer_id, walletRefundCents, orderId);
    if (!walletResult.success) {
      await supabase
        .from('orders')
        .update({
          refund_status: 'failed',
          refund_error: `Wallet refund failed: ${walletResult.error}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      return { success: false, walletRefundedCents: 0, everypayRefundedCents, error: `Wallet refund failed: ${walletResult.error}` };
    }
    walletRefundedCents = walletRefundCents;
  }

  // Update refund tracking (partial refund doesn't change order status)
  await supabase
    .from('orders')
    .update({
      refund_status: refundMethod === 'everypay_card' ? 'processing' : 'completed',
      refund_amount: refundAmountCents / 100,
      refunded_at: new Date().toISOString(),
      refund_completed_at: refundMethod === 'wallet_only' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  return { success: true, walletRefundedCents, everypayRefundedCents, refundMethod };
}

/**
 * Confirm a manual SEPA refund has been processed
 * Called by staff after completing a bank transfer
 */
export async function confirmSepaRefund(
  supabase: SupabaseClient,
  orderId: string,
  sepaReference: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('orders')
    .update({
      refund_status: 'completed',
      refund_sepa_reference: sepaReference,
      refund_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('refund_status', 'manual_sepa_required');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
