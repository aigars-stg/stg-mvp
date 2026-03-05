/**
 * Refund service
 * Handles pre-completion refunds (EveryPay + wallet portions)
 * Refunds are only allowed before order completion (before seller wallet is credited)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { refundToWallet } from './wallet';

// Statuses that allow refunds (before seller wallet credit, plus disputed)
export const REFUNDABLE_STATUSES = [
  'pending_seller',
  'accepted',
  'shipped',
  'delivered',
  'disputed',
] as const;

export type RefundableStatus = (typeof REFUNDABLE_STATUSES)[number];

export interface RefundResult {
  success: boolean;
  walletRefundedCents: number;
  everypayRefundedCents: number;
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
 * Process a full refund for an order
 * - Refunds EveryPay portion via EveryPay API
 * - Refunds wallet portion back to buyer's wallet
 * - Only allowed pre-completion
 */
export async function processRefund(
  supabase: SupabaseClient,
  orderId: string,
  refundEveryPay: (paymentRef: string, amountCents: number) => Promise<{ success: boolean; error?: string }>
): Promise<RefundResult> {
  // Fetch order details
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, total_amount, buyer_id, buyer_wallet_debit_cents, everypay_payment_reference')
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

  let walletRefundedCents = 0;
  let everypayRefundedCents = 0;

  // Refund EveryPay portion
  if (everypayPortionCents > 0 && order.everypay_payment_reference) {
    const epResult = await refundEveryPay(
      order.everypay_payment_reference,
      everypayPortionCents
    );
    if (!epResult.success) {
      return {
        success: false,
        walletRefundedCents: 0,
        everypayRefundedCents: 0,
        error: `EveryPay refund failed: ${epResult.error}`,
      };
    }
    everypayRefundedCents = everypayPortionCents;
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
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    console.error('Failed to update order status after refund:', updateError);
    // Refunds were processed, so still return success
  }

  return {
    success: true,
    walletRefundedCents,
    everypayRefundedCents,
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
  refundEveryPay: (paymentRef: string, amountCents: number) => Promise<{ success: boolean; error?: string }>
): Promise<RefundResult> {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, buyer_id, buyer_wallet_debit_cents, everypay_payment_reference')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: 'Order not found' };
  }

  const walletDebitCents = order.buyer_wallet_debit_cents || 0;
  // Refund wallet portion first (up to what was debited), remainder from EveryPay
  const walletRefundCents = Math.min(refundAmountCents, walletDebitCents);
  const everypayRefundCents = refundAmountCents - walletRefundCents;

  let walletRefundedCents = 0;
  let everypayRefundedCents = 0;

  if (everypayRefundCents > 0 && order.everypay_payment_reference) {
    const epResult = await refundEveryPay(order.everypay_payment_reference, everypayRefundCents);
    if (!epResult.success) {
      return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: `EveryPay refund failed: ${epResult.error}` };
    }
    everypayRefundedCents = everypayRefundCents;
  }

  if (walletRefundCents > 0) {
    const walletResult = await refundToWallet(supabase, order.buyer_id, walletRefundCents, orderId);
    if (!walletResult.success) {
      return { success: false, walletRefundedCents: 0, everypayRefundedCents, error: `Wallet refund failed: ${walletResult.error}` };
    }
    walletRefundedCents = walletRefundCents;
  }

  return { success: true, walletRefundedCents, everypayRefundedCents };
}
