/**
 * Withdrawal service
 * Handles seller withdrawal requests (wallet → bank account)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

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
 */
export async function completeWithdrawal(
  supabase: SupabaseClient,
  withdrawalId: string,
  processedBy: string,
  bankReference: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'completed',
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
      bank_reference: bankReference,
    })
    .eq('id', withdrawalId)
    .eq('status', 'pending');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
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

function mapWithdrawalRow(row: Record<string, unknown>): WithdrawalRequest {
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
