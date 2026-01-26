/**
 * Stripe Transfer Service
 * Handles transfer reversals for post-transfer refund scenarios
 * PRD Reference: Section 5.3, Section 5.4
 *
 * SERVER-ONLY: This file should only be imported in API routes
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

export interface ReverseTransferParams {
  transferId: string;
  orderId: string;
  amountCents?: number; // Optional for partial reversal
}

export interface ReverseTransferResult {
  reversalId: string;
  amount: number;
  status: string;
}

/**
 * Reverse a transfer (for refund scenarios after transfer was made).
 *
 * This is needed when:
 * 1. A refund is requested after funds were transferred to seller
 * 2. The seller's account needs to be debited
 *
 * IMPORTANT: If seller has insufficient balance, this creates a negative balance
 * that will be recovered from future earnings.
 *
 * @param params - Transfer reversal parameters
 * @returns Reversal result with ID, amount, and status
 */
export async function reverseTransfer(
  params: ReverseTransferParams
): Promise<ReverseTransferResult> {
  const { transferId, orderId, amountCents } = params;

  console.log(`🔄 [Transfer] Reversing transfer ${transferId} for order ${orderId}`);

  // Create idempotency key to prevent duplicate reversals
  const idempotencyKey = `reversal_${orderId}_${transferId}`;

  const reversal = await stripe.transfers.createReversal(
    transferId,
    {
      amount: amountCents, // Omit for full reversal
      metadata: {
        reason: 'refund_after_transfer',
        order_id: orderId,
      },
    },
    {
      idempotencyKey,
    }
  );

  console.log(`✅ [Transfer] Reversal created: ${reversal.id}, amount: €${(reversal.amount / 100).toFixed(2)}`);

  return {
    reversalId: reversal.id,
    amount: reversal.amount,
    status: 'reversed',
  };
}

/**
 * Check if a transfer can be reversed.
 *
 * @param transferId - The Stripe transfer ID
 * @returns Whether the transfer can be reversed
 */
export async function canReverseTransfer(transferId: string): Promise<boolean> {
  try {
    const transfer = await stripe.transfers.retrieve(transferId);

    // Transfer can be reversed if it hasn't been fully reversed already
    return !transfer.reversed;
  } catch (error) {
    console.error(`❌ [Transfer] Error checking transfer ${transferId}:`, error);
    return false;
  }
}

/**
 * Get transfer details.
 *
 * @param transferId - The Stripe transfer ID
 * @returns Transfer details or null if not found
 */
export async function getTransferDetails(transferId: string): Promise<{
  id: string;
  amount: number;
  destination: string;
  reversed: boolean;
  sourceTransaction: string | null;
} | null> {
  try {
    const transfer = await stripe.transfers.retrieve(transferId);

    return {
      id: transfer.id,
      amount: transfer.amount,
      destination: transfer.destination as string,
      reversed: transfer.reversed,
      sourceTransaction: transfer.source_transaction as string | null,
    };
  } catch (error) {
    console.error(`❌ [Transfer] Error retrieving transfer ${transferId}:`, error);
    return null;
  }
}
