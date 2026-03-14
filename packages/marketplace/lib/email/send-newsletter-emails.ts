/**
 * Newsletter email sending service
 * SERVER-ONLY: This file should only be imported in API routes
 */

import { sendEmail, BASE_URL } from './resend';
import { NewsletterWelcomeEmail } from './templates/newsletter-welcome';
import type { NewsletterLocale, NewsletterSource } from '@/lib/newsletter';

const subjects = {
  en: 'Welcome to the Second Turn Games',
  lv: 'Laipni lūgti Second Turn Games',
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

const STAFF_EMAIL = 'info@secondturn.games';

/**
 * Notify staff about a new newsletter subscriber (fire-and-forget)
 */
export async function notifyStaffNewSubscriber(params: {
  email: string;
  source: NewsletterSource;
  locale: NewsletterLocale;
}) {
  const { email, source, locale } = params;

  try {
    await sendEmail({
      to: STAFF_EMAIL,
      subject: `New newsletter subscriber: ${email}`,
      html: `
        <p><strong>New newsletter signup</strong></p>
        <ul>
          <li>Email: ${email}</li>
          <li>Source: ${source}</li>
          <li>Locale: ${locale}</li>
        </ul>
        <p><a href="${BASE_URL}/staff/newsletter">View all subscribers</a></p>
      `,
    });
  } catch (error) {
    console.error('❌ [Email] Failed to notify staff of new subscriber:', error);
  }
}
