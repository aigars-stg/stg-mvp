/**
 * Withdrawal service
 * Handles seller withdrawal requests (wallet → bank account)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createPayoutStatement } from './document-service';

// ==============================================
// TYPES
// ==============================================

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amountCents: number;
  iban: string;
  accountHolderName: string;
  status: WithdrawalStatus;
  processedBy: string | null;
  processedAt: string | null;
  bankReference: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

// ==============================================
// QUERIES
// ==============================================

/**
 * Get withdrawal requests for a user
 */
export async function getUserWithdrawals(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ withdrawals: WithdrawalRequest[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch withdrawals: ${error.message}`);
  }

  return {
    withdrawals: (data || []).map(mapWithdrawalRow),
    total: count || 0,
  };
}

/**
 * Get all pending withdrawal requests (for staff)
 */
export async function getPendingWithdrawals(
  supabase: SupabaseClient,
  options: { limit?: number; offset?: number } = {}
): Promise<{ withdrawals: WithdrawalRequest[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch pending withdrawals: ${error.message}`);
  }

  return {
    withdrawals: (data || []).map(mapWithdrawalRow),
    total: count || 0,
  };
}

// ==============================================
// MUTATIONS
// ==============================================

/**
 * Create a withdrawal request
 * Debits wallet and creates a pending withdrawal record atomically
 */
export async function createWithdrawalRequest(
  supabase: SupabaseClient,
  userId: string,
  amountCents: number,
  iban: string,
  accountHolderName: string
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_withdrawal_request', {
    p_user_id: userId,
    p_amount_cents: amountCents,
    p_iban: iban,
    p_account_holder_name: accountHolderName,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Mark a withdrawal as completed (staff action)
 * Also generates a payout statement document for the seller.
 */
export async function completeWithdrawal(
  supabase: SupabaseClient,
  withdrawalId: string,
  processedBy: string,
  bankReference: string
): Promise<{ success: boolean; documentNumber?: string; error?: string }> {
  // Fetch withdrawal to get seller ID and amount
  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('id, user_id, amount_cents, iban, account_holder_name, created_at')
    .eq('id', withdrawalId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !withdrawal) {
    return { success: false, error: 'Withdrawal not found or not pending' };
  }

  const processedAt = new Date().toISOString();

  // Mark withdrawal as completed and fetch credited orders in parallel
  const [updateResult, ordersResult] = await Promise.all([
    supabase
      .from('withdrawal_requests')
      .update({
        status: 'completed',
        processed_by: processedBy,
        processed_at: processedAt,
        bank_reference: bankReference,
      })
      .eq('id', withdrawalId)
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id, order_number, invoice_number, paid_at, items_total, platform_commission_cents, seller_wallet_credit_cents')
      .eq('seller_id', withdrawal.user_id)
      .not('wallet_credited_at', 'is', null)
      .lte('wallet_credited_at', withdrawal.created_at)
      .order('paid_at', { ascending: true }),
  ]);

  if (updateResult.error) {
    return { success: false, error: updateResult.error.message };
  }

  if (ordersResult.error) {
    return { success: false, error: `Failed to fetch orders for statement: ${ordersResult.error.message}` };
  }

  const orders = ordersResult.data;

  // Generate payout statement document
  const statementData = {
    withdrawal_id: withdrawalId,
    amount_cents: withdrawal.amount_cents,
    iban: withdrawal.iban,
    account_holder_name: withdrawal.account_holder_name,
    bank_reference: bankReference,
    processed_at: processedAt,
    orders: orders.map((o) => ({
      order_number: o.order_number,
      invoice_number: o.invoice_number,
      paid_at: o.paid_at,
      items_total: o.items_total,
      platform_commission_cents: o.platform_commission_cents,
      seller_wallet_credit_cents: o.seller_wallet_credit_cents,
    })),
  };

  const result = await createPayoutStatement(
    supabase,
    withdrawalId,
    withdrawal.user_id,
    statementData,
  );

  return { success: true, documentNumber: result?.documentNumber };
}

/**
 * Reject a withdrawal request (staff action)
 * Refunds the amount back to the user's wallet
 */
export async function rejectWithdrawal(
  supabase: SupabaseClient,
  withdrawalId: string,
  processedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('reject_withdrawal_request', {
    p_withdrawal_id: withdrawalId,
    p_processed_by: processedBy,
    p_reason: reason,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

// ==============================================
// HELPERS
// ==============================================

export function mapWithdrawalRow(row: Record<string, unknown>): WithdrawalRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    amountCents: row.amount_cents as number,
    iban: row.iban as string,
    accountHolderName: row.account_holder_name as string,
    status: row.status as WithdrawalStatus,
    processedBy: row.processed_by as string | null,
    processedAt: row.processed_at as string | null,
    bankReference: row.bank_reference as string | null,
    rejectionReason: row.rejection_reason as string | null,
    createdAt: row.created_at as string,
  };
}
