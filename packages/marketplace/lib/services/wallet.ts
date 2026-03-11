/**
 * Wallet service
 * Handles wallet balance operations: credit, debit, balance queries
 * All wallet mutations use atomic Postgres functions to prevent race conditions
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ==============================================
// TYPES
// ==============================================

export type WalletTransactionType =
  | 'sale_credit'
  | 'purchase_debit'
  | 'withdrawal'
  | 'refund_credit';

export interface WalletBalance {
  balanceCents: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  orderId: string | null;
  withdrawalId: string | null;
  description: string | null;
  createdAt: string;
}

// ==============================================
// QUERIES
// ==============================================

/**
 * Get wallet balance for a user
 * Returns 0 if wallet doesn't exist yet (auto-created on first transaction)
 */
export async function getWalletBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<WalletBalance> {
  const { data, error } = await supabase
    .from('wallets')
    .select('balance_cents')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No wallet row yet — balance is 0
    return { balanceCents: 0 };
  }

  if (error) {
    throw new Error(`Failed to fetch wallet balance: ${error.message}`);
  }

  return { balanceCents: data.balance_cents };
}

/**
 * Get wallet transaction history for a user
 */
export async function getWalletTransactions(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; offset?: number; dateFrom?: string; dateTo?: string } = {}
): Promise<{ transactions: WalletTransaction[]; total: number }> {
  const { limit = 20, offset = 0, dateFrom, dateTo } = options;

  let query = supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch wallet transactions: ${error.message}`);
  }

  const transactions: WalletTransaction[] = (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type as WalletTransactionType,
    amountCents: row.amount_cents,
    balanceAfterCents: row.balance_after_cents,
    orderId: row.order_id,
    withdrawalId: row.withdrawal_id,
    description: row.description,
    createdAt: row.created_at,
  }));

  return { transactions, total: count || 0 };
}

// ==============================================
// MUTATIONS (via Postgres RPCs for atomicity)
// ==============================================

/**
 * Credit seller wallet when order completes
 * Called by complete_delivered_orders cron or manual completion
 * Uses atomic RPC to prevent double-crediting
 */
export async function creditSellerWallet(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await (supabase.rpc as (...args: unknown[]) => ReturnType<typeof supabase.rpc>)('credit_seller_wallet', {
    p_order_id: orderId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Debit buyer wallet for a purchase
 * Returns the actual amount debited (may be less than requested if balance insufficient)
 * Uses atomic RPC to prevent overdraft
 */
export async function debitBuyerWallet(
  supabase: SupabaseClient,
  userId: string,
  amountCents: number,
  orderId: string
): Promise<{ success: boolean; debitedCents: number; error?: string }> {
  const { data, error } = await (supabase.rpc as (...args: unknown[]) => ReturnType<typeof supabase.rpc>)('debit_buyer_wallet', {
    p_user_id: userId,
    p_amount_cents: amountCents,
    p_order_id: orderId,
  });

  if (error) {
    return { success: false, debitedCents: 0, error: error.message };
  }

  return data;
}

/**
 * Refund wallet portion back to buyer
 * Used when a pre-completion order is refunded
 */
export async function refundToWallet(
  supabase: SupabaseClient,
  userId: string,
  amountCents: number,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  if (amountCents <= 0) {
    return { success: true }; // Nothing to refund
  }

  const { data, error } = await supabase.rpc('credit_wallet', {
    p_user_id: userId,
    p_amount_cents: amountCents,
    p_type: 'refund_credit',
    p_order_id: orderId,
    p_description: 'Refund to wallet',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}
