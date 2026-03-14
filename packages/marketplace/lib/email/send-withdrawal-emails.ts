/**
 * Withdrawal email sending service
 * SERVER-ONLY: This file should only be imported in API routes
 */

import { sendEmail } from './resend';
import { WithdrawalCompletedEmail } from './templates/withdrawal-completed';
import { WithdrawalRejectedEmail } from './templates/withdrawal-rejected';
import { loggers } from '../logger';

/**
 * Send withdrawal completed notification to seller
 */
export async function sendWithdrawalCompletedToSeller(params: {
  sellerName: string;
  sellerEmail: string;
  amountEuros: string;
  maskedIban: string;
  bankReference: string;
  processedDate: string;
}) {
  const { sellerName, sellerEmail, amountEuros, maskedIban, bankReference, processedDate } = params;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `Withdrawal processed — \u20AC${amountEuros}`,
      react: WithdrawalCompletedEmail({
        sellerName,
        amountEuros,
        maskedIban,
        bankReference,
        processedDate,
      }),
    });

    loggers.email.info({ sellerEmail, amountEuros }, 'Withdrawal completed email sent to seller');
    return { success: true };
  } catch (error) {
    loggers.email.error({ sellerEmail, amountEuros, error }, 'Failed to send withdrawal completed email');
    return { success: false, error };
  }
}

/**
 * Send withdrawal rejected notification to seller
 */
export async function sendWithdrawalRejectedToSeller(params: {
  sellerName: string;
  sellerEmail: string;
  amountEuros: string;
  rejectionReason: string;
}) {
  const { sellerName, sellerEmail, amountEuros, rejectionReason } = params;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `Withdrawal not processed — \u20AC${amountEuros}`,
      react: WithdrawalRejectedEmail({
        sellerName,
        amountEuros,
        rejectionReason,
      }),
    });

    loggers.email.info({ sellerEmail, amountEuros }, 'Withdrawal rejected email sent to seller');
    return { success: true };
  } catch (error) {
    loggers.email.error({ sellerEmail, amountEuros, error }, 'Failed to send withdrawal rejected email');
    return { success: false, error };
  }
}

/**
 * Mask an IBAN for display in emails: show country + last 4 chars only
 * e.g., "LV80BANK0000435195001" → "LV**************5001"
 */
export function maskIban(iban: string): string {
  const cleaned = iban.replace(/\s/g, '');
  if (cleaned.length <= 6) return cleaned;
  const country = cleaned.substring(0, 2);
  const last4 = cleaned.substring(cleaned.length - 4);
  const masked = '*'.repeat(cleaned.length - 6);
  return `${country}${masked}${last4}`;
}
