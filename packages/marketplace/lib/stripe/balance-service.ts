/**
 * Stripe Balance Service
 * Handles fetching and caching seller balance from Stripe Connect
 * SERVER-ONLY: This file should only be imported in API routes
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Simple in-memory cache for balance data
// Key: user_id, Value: { balance, cachedAt }
const balanceCache = new Map<
  string,
  {
    balance: SellerBalance;
    cachedAt: Date;
  }
>();

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export interface SellerBalance {
  available: {
    amount: number; // in cents
    currency: string;
  };
  pending: {
    amount: number; // in cents
    currency: string;
  };
  total: {
    amount: number; // in cents
    currency: string;
  };
  cachedAt: string; // ISO timestamp
}

/**
 * Clear balance cache for a specific user
 * Call this when we know balance has changed (e.g., after payout)
 */
export function clearBalanceCache(userId: string): void {
  balanceCache.delete(userId);
}

/**
 * Get seller's Stripe balance
 * Returns cached data if fresh (within 60 seconds)
 */
export async function getSellerBalance(
  userId: string,
  stripeAccountId: string
): Promise<SellerBalance> {
  // Check cache first
  const cached = balanceCache.get(userId);
  if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS) {
    console.log(`💰 [Balance] Returning cached balance for user ${userId}`);
    return cached.balance;
  }

  console.log(`💰 [Balance] Fetching fresh balance from Stripe for ${stripeAccountId}`);

  try {
    // Fetch balance from Stripe for the connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    // Find EUR balance (or default to 0)
    const eurAvailable = balance.available.find((b) => b.currency === 'eur');
    const eurPending = balance.pending.find((b) => b.currency === 'eur');

    const availableAmount = eurAvailable?.amount || 0;
    const pendingAmount = eurPending?.amount || 0;

    const sellerBalance: SellerBalance = {
      available: {
        amount: availableAmount,
        currency: 'eur',
      },
      pending: {
        amount: pendingAmount,
        currency: 'eur',
      },
      total: {
        amount: availableAmount + pendingAmount,
        currency: 'eur',
      },
      cachedAt: new Date().toISOString(),
    };

    // Cache the result
    balanceCache.set(userId, {
      balance: sellerBalance,
      cachedAt: new Date(),
    });

    console.log(
      `✅ [Balance] Balance fetched: available=${availableAmount}, pending=${pendingAmount}`
    );

    return sellerBalance;
  } catch (error: unknown) {
    console.error('❌ [Balance] Error fetching balance:', error);
    throw error;
  }
}

/**
 * Format amount from cents to display string
 * e.g., 12450 -> "124.50"
 */
export function formatAmountFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Format amount with currency symbol
 * e.g., 12450 -> "€124.50"
 */
export function formatCurrency(cents: number, currency: string = 'eur'): string {
  const amount = cents / 100;
  const formatter = new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount);
}
