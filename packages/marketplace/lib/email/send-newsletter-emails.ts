/**
 * Newsletter email sending service
 * SERVER-ONLY: This file should only be imported in API routes
 */

import { sendEmail } from './resend';
import { NewsletterWelcomeEmail } from './templates/newsletter-welcome';
import type { NewsletterLocale } from '@/lib/newsletter';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://secondturn.games';

const subjects = {
  en: 'Welcome to the Second Turn community',
  lv: 'Laipni lūgti Second Turn kopienā',
};

/**
 * Send welcome email to new newsletter subscriber
 */
export async function sendNewsletterWelcomeEmail(params: {
  email: string;
  locale: NewsletterLocale;
  unsubscribeToken: string;
}) {
  const { email, locale, unsubscribeToken } = params;

  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
  const browseUrl = locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`;

  try {
    await sendEmail({
      to: email,
      subject: subjects[locale] || subjects.en,
      react: NewsletterWelcomeEmail({
        locale,
        unsubscribeUrl,
        browseUrl,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('❌ [Email] Failed to send newsletter welcome email:', error);
    return { success: false, error };
  }
}
