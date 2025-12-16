
import { stripe } from '@/lib/stripe';

export type AccountStatusResult = {
    canDelete: boolean;
    reason?: string;
    details?: {
        balance?: {
            available: number;
            pending: number;
            currency: string;
        };
        disputes?: {
            count: number;
            status: string;
        }[];
    };
};

/**
 * Checks if a seller's Stripe account is in a state that allows deletion.
 * Blocks deletion if:
 * 1. Positive balance (funds need payout)
 * 2. Negative balance (debt needs coverage)
 * 3. Open disputes (liability)
 */
export async function checkSellerAccountStatus(accountId: string): Promise<AccountStatusResult> {
    try {
        // 1. Check Balance
        const balance = await stripe.balance.retrieve({
            stripeAccount: accountId,
        });

        // Sum up available and pending balances across all currencies
        // Usually sellers only have EUR, but we should be safe
        let totalAvailable = 0;
        let totalPending = 0;

        for (const bal of balance.available) {
            totalAvailable += bal.amount;
        }
        for (const bal of balance.pending) {
            totalPending += bal.amount;
        }

        const hasFunds = totalAvailable > 0 || totalPending > 0;
        const hasDebt = totalAvailable < 0 || totalPending < 0;

        if (hasFunds) {
            return {
                canDelete: false,
                reason: 'You have funds in your seller account. Please wait for them to be paid out to your bank account.',
                details: {
                    balance: {
                        available: totalAvailable,
                        pending: totalPending,
                        currency: balance.available[0]?.currency || 'eur',
                    },
                },
            };
        }

        if (hasDebt) {
            return {
                canDelete: false,
                reason: 'Your seller account has a negative balance. Please contact support to resolve this.',
                details: {
                    balance: {
                        available: totalAvailable,
                        pending: totalPending,
                        currency: balance.available[0]?.currency || 'eur',
                    },
                },
            };
        }

        // 2. Check Open Disputes


        // Also check for 'warning_needs_response' and 'under_review' just in case, 
        // though 'status' filter in list is singular. 
        // Better to list recent disputes and filter in memory if volume is low, 
        // or just make multiple calls. For MVP, checking ALL non-won/lost is safer.

        // Actually, Stripe API 'status' param is specific. 
        // Let's fetch the most recent 100 and filter JS side to be sure we catch any active state.
        const allRecentDisputes = await stripe.disputes.list(
            {
                limit: 100,
            },
            { stripeAccount: accountId }
        );

        const activeDisputes = allRecentDisputes.data.filter(d =>
            ['needs_response', 'warning_needs_response', 'under_review', 'warning_under_review', 'charge_refunded'].includes(d.status)
            // 'won', 'lost', 'warning_closed' are final states usually (safe to delete? maybe 'lost' means debt?)
            // If 'lost', balance check should catch the debt.
            // So mainly we care about ongoing processes.
        );

        if (activeDisputes.length > 0) {
            return {
                canDelete: false,
                reason: 'You have open disputes that must be resolved before deleting your account.',
                details: {
                    disputes: activeDisputes.map(d => ({ count: 1, status: d.status })),
                },
            };
        }

        // 3. (Optional) Check Pending Transfers/Payouts? 
        // Balance 'pending' usually covers this.

        return {
            canDelete: true,
        };

    } catch (error: any) {
        console.error(`Error checking Stripe account ${accountId}:`, error);

        // If account doesn't exist, it's safe to delete local user
        if (error.code === 'account_invalid') {
            return { canDelete: true };
        }

        // Fail safe
        return {
            canDelete: false,
            reason: 'Could not verify seller account status. Please contact support.',
        };
    }
}
