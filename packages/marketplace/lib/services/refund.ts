/**
 * Refund service
 * Handles pre-completion refunds (EveryPay + wallet portions)
 * Refunds are only allowed before order completion (before seller wallet is credited)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { refundToWallet } from './wallet';

// Statuses that allow refunds (before seller wallet credit)
const REFUNDABLE_STATUSES = [
  'pending_seller',
  'confirmed',
  'shipped',
  'delivered',
] as const;

export interface RefundResult {
  success: boolean;
  walletRefundedCents: number;
  everypayRefundedCents: number;
  error?: string;
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
  if (!REFUNDABLE_STATUSES.includes(order.status)) {
    return {
      success: false,
      walletRefundedCents: 0,
      everypayRefundedCents: 0,
      error: 'Order cannot be refunded after completion',
    };
  }

  const totalAmountCents = Math.round(order.total_amount * 100);
  const walletPortionCents = order.buyer_wallet_debit_cents || 0;
  const everypayPortionCents = totalAmountCents - walletPortionCents;

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
