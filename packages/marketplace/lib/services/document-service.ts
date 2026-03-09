/**
 * Document data-fetching service layer.
 * Used by document pages (invoice, confirmation, payout statement) to load
 * order/withdrawal data from Supabase.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface CommissionInvoiceData {
  document: {
    id: string;
    document_number: string;
    data: Record<string, unknown>;
    created_at: string;
  };
  order: {
    id: string;
    order_number: string;
    status: string;
    paid_at: string | null;
    created_at: string;
    items_total: number;
    shipping_cost: number;
    total_amount: number;
    platform_commission_cents: number;
    seller_wallet_credit_cents: number;
    commission_net_cents: number | null;
    commission_vat_cents: number | null;
    commission_vat_rate: number | null;
    shipping_net_cents: number | null;
    shipping_vat_cents: number | null;
    shipping_vat_rate: number | null;
    sender_country: string | null;
    invoice_number: string | null;
  };
  seller: {
    id: string;
    full_name: string;
    country: string | null;
  };
}

export interface OrderConfirmationData {
  order: {
    id: string;
    order_number: string;
    status: string;
    paid_at: string | null;
    created_at: string;
    items_total: number;
    shipping_cost: number;
    total_amount: number;
    shipping_method: string;
    destination_terminal_name: string | null;
    destination_terminal_address: string | null;
    destination_country: string | null;
    pickup_city: string | null;
    pickup_notes: string | null;
    buyer_wallet_debit_cents: number | null;
    payment_method: string | null;
  };
  buyer: {
    id: string;
    full_name: string;
  };
  seller: {
    id: string;
    full_name: string;
  };
  items: Array<{
    id: string;
    game_name: string;
    condition: string;
    price: number;
  }>;
}

export interface PayoutStatementData {
  document: {
    id: string;
    document_number: string;
    data: Record<string, unknown>;
    created_at: string;
  };
  withdrawal: {
    id: string;
    amount_cents: number;
    status: string;
    iban: string;
    account_holder_name: string;
    created_at: string;
    processed_at: string | null;
    bank_reference: string | null;
  };
  seller: {
    id: string;
    full_name: string;
    country: string | null;
  };
  orders: Array<{
    id: string;
    order_number: string;
    invoice_number: string | null;
    paid_at: string | null;
    items_total: number;
    platform_commission_cents: number;
    seller_wallet_credit_cents: number;
  }>;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch all data needed to render a commission invoice.
 * Returns null if order/document not found or user lacks access.
 */
export async function getCommissionInvoiceData(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  isStaff: boolean,
): Promise<CommissionInvoiceData | null> {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, paid_at, created_at,
      items_total, shipping_cost, total_amount,
      platform_commission_cents, seller_wallet_credit_cents,
      commission_net_cents, commission_vat_cents, commission_vat_rate,
      shipping_net_cents, shipping_vat_cents, shipping_vat_rate,
      sender_country, invoice_number, seller_id
    `)
    .eq('id', orderId)
    .single();

  if (!order) return null;

  // Access check: seller or staff
  if (!isStaff && order.seller_id !== userId) return null;

  // Invoice only available for completed orders
  if (!order.invoice_number) return null;

  const [{ data: document }, { data: seller }] = await Promise.all([
    supabase
      .from('platform_documents')
      .select('id, document_number, data, created_at')
      .eq('order_id', orderId)
      .eq('document_type', 'commission_invoice')
      .single(),
    supabase
      .from('user_profiles')
      .select('id, full_name, country')
      .eq('id', order.seller_id)
      .single(),
  ]);

  if (!document || !seller) return null;

  return { document, order, seller };
}

/**
 * Fetch all data needed to render a buyer order confirmation.
 * Returns null if order not found or user lacks access.
 */
export async function getOrderConfirmationData(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  isStaff: boolean,
): Promise<OrderConfirmationData | null> {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, paid_at, created_at,
      items_total, shipping_cost, total_amount,
      shipping_method, destination_terminal_name, destination_terminal_address,
      destination_country, pickup_city, pickup_notes,
      buyer_wallet_debit_cents, payment_method,
      buyer_id, seller_id
    `)
    .eq('id', orderId)
    .single();

  if (!order) return null;

  // Access check: buyer or staff
  if (!isStaff && order.buyer_id !== userId) return null;

  const [{ data: buyer }, { data: seller }, { data: items }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', order.buyer_id)
      .single(),
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', order.seller_id)
      .single(),
    supabase
      .from('order_items')
      .select('id, game_name, condition, price')
      .eq('order_id', orderId),
  ]);

  if (!buyer || !seller) return null;

  return { order, buyer, seller, items: items || [] };
}

/**
 * Fetch all data needed to render a payout statement.
 * Returns null if withdrawal/document not found or user lacks access.
 */
export async function getPayoutStatementData(
  supabase: SupabaseClient,
  withdrawalId: string,
  userId: string,
  isStaff: boolean,
): Promise<PayoutStatementData | null> {
  const { data: withdrawal } = await supabase
    .from('withdrawal_requests')
    .select('id, user_id, amount_cents, status, iban, account_holder_name, created_at, processed_at, bank_reference')
    .eq('id', withdrawalId)
    .single();

  if (!withdrawal) return null;

  // Access check: seller or staff
  if (!isStaff && withdrawal.user_id !== userId) return null;

  // Statement only available for completed withdrawals
  if (withdrawal.status !== 'completed') return null;

  const [{ data: document }, { data: seller }, { data: orders }] = await Promise.all([
    supabase
      .from('platform_documents')
      .select('id, document_number, data, created_at')
      .eq('withdrawal_id', withdrawalId)
      .eq('document_type', 'payout_statement')
      .single(),
    supabase
      .from('user_profiles')
      .select('id, full_name, country')
      .eq('id', withdrawal.user_id)
      .single(),
    supabase
      .from('orders')
      .select('id, order_number, invoice_number, paid_at, items_total, platform_commission_cents, seller_wallet_credit_cents')
      .eq('seller_id', withdrawal.user_id)
      .not('wallet_credited_at', 'is', null)
      .lte('wallet_credited_at', withdrawal.created_at)
      .order('paid_at', { ascending: true }),
  ]);

  if (!document || !seller) return null;

  return {
    document,
    withdrawal,
    seller,
    orders: orders || [],
  };
}

/**
 * Create a payout statement document when a withdrawal is completed.
 * Called from the staff withdrawal completion flow.
 */
export async function createPayoutStatement(
  supabase: SupabaseClient,
  withdrawalId: string,
  sellerId: string,
  data: Record<string, unknown>,
): Promise<{ documentNumber: string } | null> {
  const { data: result, error } = await supabase.rpc('generate_payout_statement_number');
  if (error || !result) return null;

  const documentNumber = result as string;

  const { error: insertError } = await supabase
    .from('platform_documents')
    .insert({
      document_type: 'payout_statement',
      document_number: documentNumber,
      withdrawal_id: withdrawalId,
      seller_id: sellerId,
      data,
    });

  if (insertError) return null;

  return { documentNumber };
}

/**
 * Create a credit note document when a post-completion refund is processed.
 * References the original commission invoice via original_document_id.
 */
export async function createCreditNote(
  supabase: SupabaseClient,
  orderId: string,
  sellerId: string,
  originalDocumentId: string,
  data: Record<string, unknown>,
): Promise<{ documentNumber: string } | null> {
  const { data: result, error } = await supabase.rpc('generate_credit_note_number');
  if (error || !result) return null;

  const documentNumber = result as string;

  const { error: insertError } = await supabase
    .from('platform_documents')
    .insert({
      document_type: 'credit_note',
      document_number: documentNumber,
      order_id: orderId,
      seller_id: sellerId,
      original_document_id: originalDocumentId,
      data,
    });

  if (insertError) return null;

  return { documentNumber };
}

// ============================================================================
// CREDIT NOTE DATA FETCHING
// ============================================================================

export interface CreditNoteData {
  document: {
    id: string;
    document_number: string;
    data: Record<string, unknown>;
    created_at: string;
    original_document_id: string | null;
  };
  order: {
    id: string;
    order_number: string;
    status: string;
    invoice_number: string | null;
    items_total: number;
    shipping_cost: number;
    total_amount: number;
    platform_commission_cents: number;
    seller_wallet_credit_cents: number;
    commission_net_cents: number | null;
    commission_vat_cents: number | null;
    commission_vat_rate: number | null;
    shipping_net_cents: number | null;
    shipping_vat_cents: number | null;
    shipping_vat_rate: number | null;
    sender_country: string | null;
    refund_amount: number | null;
    refund_reason: string | null;
  };
  seller: {
    id: string;
    full_name: string;
    country: string | null;
  };
}

/**
 * Fetch all data needed to render a credit note.
 * Returns null if order/document not found or user lacks access.
 */
export async function getCreditNoteData(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  isStaff: boolean,
): Promise<CreditNoteData | null> {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, invoice_number,
      items_total, shipping_cost, total_amount,
      platform_commission_cents, seller_wallet_credit_cents,
      commission_net_cents, commission_vat_cents, commission_vat_rate,
      shipping_net_cents, shipping_vat_cents, shipping_vat_rate,
      sender_country, refund_amount, refund_reason, seller_id
    `)
    .eq('id', orderId)
    .single();

  if (!order) return null;

  // Access check: seller or staff
  if (!isStaff && order.seller_id !== userId) return null;

  // Credit note only exists for refunded orders
  if (order.status !== 'refunded') return null;

  const [{ data: document }, { data: seller }] = await Promise.all([
    supabase
      .from('platform_documents')
      .select('id, document_number, data, created_at, original_document_id')
      .eq('order_id', orderId)
      .eq('document_type', 'credit_note')
      .single(),
    supabase
      .from('user_profiles')
      .select('id, full_name, country')
      .eq('id', order.seller_id)
      .single(),
  ]);

  if (!document || !seller) return null;

  return { document, order, seller };
}
