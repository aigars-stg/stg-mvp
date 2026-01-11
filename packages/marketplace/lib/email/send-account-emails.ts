/**
 * Account email sending service
 * SERVER-ONLY: This file should only be imported in API routes
 */

import { sendEmail } from './resend';
import { AccountDeletedEmail } from './templates/account-deleted';
import { LoginAlertEmail } from './templates/login-alert';

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

/**
 * Send login alert email to user
 * Sent when a login is detected, especially for unusual logins
 */
export async function sendLoginAlertEmail(params: {
    email: string;
    userName: string;
    loginTime: Date;
    device: string;
    location: string;
    ipAddress: string;
    isUnusual: boolean;
}) {
    const { email, userName, loginTime, device, location, ipAddress, isUnusual } = params;

    // Format time for display (e.g., "January 11, 2026 at 10:30 AM")
    const formattedTime = loginTime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    const subject = isUnusual
        ? 'Unusual login detected on your Second Turn account'
        : 'New login to your Second Turn account';

    try {
        await sendEmail({
            to: email,
            subject,
            react: LoginAlertEmail({
                userName,
                loginTime: formattedTime,
                device,
                location,
                ipAddress,
                isUnusual,
                securityUrl: 'https://secondturn.games/account/security',
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('❌ [Email] Failed to send login alert email:', error);
        return { success: false, error };
    }
}
