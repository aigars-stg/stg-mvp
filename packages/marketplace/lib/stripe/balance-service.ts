/**
 * Stripe Balance Service
 * Handles fetching and caching seller balance from Stripe Connect
 * SERVER-ONLY: This file should only be imported in API routes
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// ============================================
// PLATFORM-HELD FUNDS
// ============================================

export interface PlatformHeldOrder {
  id: string;
  order_number: string;
  items_total: number; // in euros
  status: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface PlatformHeldFunds {
  amount: number; // in cents
  orderCount: number;
  orders: PlatformHeldOrder[];
}

/**
 * Get funds held by platform for a seller
 * These are orders that have been paid but not yet completed
 * (status: pending_seller, confirmed, shipped, delivered)
 */
export async function getPlatformHeldFunds(userId: string): Promise<PlatformHeldFunds> {
  // Query orders where:
  // - seller_id = userId
  // - status IN ('pending_seller', 'confirmed', 'shipped', 'delivered') - not yet completed
  // - NOT cancelled, refunded, or disputed
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, items_total, status, created_at, shipped_at, delivered_at')
    .eq('seller_id', userId)
    .in('status', ['pending_seller', 'confirmed', 'shipped', 'delivered']);

  if (error) {
    console.error('❌ [Balance] Error fetching held funds:', error);
    return { amount: 0, orderCount: 0, orders: [] };
  }

  if (!orders || orders.length === 0) {
    return { amount: 0, orderCount: 0, orders: [] };
  }

  // Sum up items_total for all orders (seller receives items_total, not shipping/fees)
  const totalEuros = orders.reduce((sum, order) => sum + (order.items_total || 0), 0);
  const totalCents = Math.round(totalEuros * 100);

  return {
    amount: totalCents,
    orderCount: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      items_total: o.items_total,
      status: o.status,
      created_at: o.created_at,
      shipped_at: o.shipped_at,
      delivered_at: o.delivered_at,
    })),
  };
}
