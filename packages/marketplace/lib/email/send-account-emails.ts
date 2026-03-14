/**
 * Account email sending service
 * SERVER-ONLY: This file should only be imported in API routes
 */

import { sendEmail, BASE_URL } from './resend';
import { AccountDeletedEmail } from './templates/account-deleted';
import { WelcomeNewUserEmail } from './templates/welcome-new-user';


/**
 * Send account deletion confirmation to user
 */
export async function sendAccountDeletedEmail(params: {
    email: string;
    name: string;
    recoveryDate: Date;
}) {
    const { email, name, recoveryDate } = params;

    // Format date for display (e.g., "December 31, 2025")
    const formattedDate = recoveryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    try {
        await sendEmail({
            to: email,
            subject: 'Account Deletion Request - Action Required by ' + formattedDate,
            react: AccountDeletedEmail({
                userName: name,
                recoveryDate: formattedDate,
                supportUrl: 'mailto:info@secondturn.games',
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('❌ [Email] Failed to send account deleted email:', error);
        return { success: false, error };
    }
}

const welcomeSubjects = {
    en: 'Welcome to Second Turn Games',
    lv: 'Laipni lūgti Second Turn Games',
};

/**
 * Send welcome email to newly registered user
 */
export async function sendWelcomeEmail(params: {
    email: string;
    locale: 'en' | 'lv';
}) {
    const { email, locale } = params;
    const localePrefix = locale === 'en' ? '' : `/${locale}`;

    try {
        await sendEmail({
            to: email,
            subject: welcomeSubjects[locale] || welcomeSubjects.en,
            react: WelcomeNewUserEmail({
                locale,
                profileUrl: `${BASE_URL}${localePrefix}/account/settings`,
                browseUrl: `${BASE_URL}${localePrefix}`,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('❌ [Email] Failed to send welcome email:', error);
        return { success: false, error };
    }
}
