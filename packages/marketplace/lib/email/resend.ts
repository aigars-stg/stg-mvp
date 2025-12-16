/**
 * Resend email client
 * WARNING: This file should only be imported in server-side code (API routes, server components)
 */

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}

/**
 * Resend client instance (SERVER-ONLY)
 */
export const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Default sender email
 * Uses RESEND_FROM_EMAIL environment variable or falls back to default
 * Make sure this domain is verified in your Resend account
 */
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Second Turn <info@secondturn.games>';

/**
 * Send email helper
 */
export async function sendEmail({
  to,
  subject,
  html,
  react,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  react?: React.ReactElement;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      react,
    });

    if (error) {
      console.error('❌ [Email] Failed to send:', error);
      throw error;
    }

    console.log(`✅ [Email] Sent: ${subject} → ${Array.isArray(to) ? to.join(', ') : to}`);
    return data;
  } catch (error) {
    console.error('❌ [Email] Error:', error);
    throw error;
  }
}
