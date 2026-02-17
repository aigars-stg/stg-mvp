/**
 * Payment capture/release routing
 *
 * Pure functions that decide whether to capture, void, or refund an EveryPay payment.
 * With capture delay enabled, card payments sit in 'authorised' state until the seller
 * accepts (capture) or declines/expires (void). Bank link payments settle immediately
 * and fall back to refund on cancellation.
 *
 * Used by: accept endpoint, decline endpoint, expire-seller-deadlines cron
 */

export type ReleaseAction = 'void' | 'refund' | 'none';

/**
 * Calculate the EveryPay portion in cents from order totals.
 * total_amount is stored in euros (decimal), buyer_wallet_debit_cents in integer cents.
 */
export function calculateEverypayPortionCents(
  totalAmountEuros: number,
  walletDebitCents: number | null | undefined
): number {
  const totalCents = Math.round(totalAmountEuros * 100);
  return totalCents - (walletDebitCents || 0);
}

/**
 * Determine the action needed to release funds back to buyer.
 *
 * - 'void': payment is pre-authorised, can be voided (free, instant)
 * - 'refund': payment is already settled, must be refunded via API
 * - 'none': no EveryPay portion to release (wallet-only or missing reference)
 */
export function determineReleaseAction(
  paymentState: string | null | undefined,
  paymentReference: string | null | undefined,
  everypayPortionCents: number
): ReleaseAction {
  if (everypayPortionCents <= 0 || !paymentReference) {
    return 'none';
  }

  if (paymentState === 'authorised') {
    return 'void';
  }

  return 'refund';
}

/**
 * Whether an order's EveryPay payment needs capturing on accept.
 * Only pre-authorised card payments need explicit capture.
 * Bank links and wallet-only payments are already settled.
 */
export function needsCapture(
  paymentState: string | null | undefined,
  paymentReference: string | null | undefined,
  everypayPortionCents: number
): boolean {
  return (
    paymentState === 'authorised' &&
    !!paymentReference &&
    everypayPortionCents > 0
  );
}
