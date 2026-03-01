/**
 * Transaction System Messages
 *
 * Utility functions for posting system messages to transaction conversations.
 * These are auto-generated messages that inform users about order status changes.
 */

import { createServiceClient } from '@/lib/supabase/client';
import { SystemMessageType } from '@/lib/types/message';

/**
 * System message templates by type
 */
const SYSTEM_MESSAGE_TEMPLATES: Record<
  SystemMessageType,
  (metadata?: Record<string, string>) => string
> = {
  order_created: () => 'Order placed. Seller has 24 hours to respond.',
  order_accepted: (meta) =>
    meta?.shippingMethod === 'local_pickup'
      ? 'Seller accepted the order. Coordinate pickup details below.'
      : meta?.labelGenerated === 'false' // string — metadata values are Record<string, string>
        ? 'Seller accepted the order. Shipping label could not be generated — the seller will arrange shipping shortly.'
        : 'Seller accepted the order. Shipping label created.',
  order_declined: (meta) =>
    meta?.reason
      ? `Seller declined the order: ${meta.reason}. Your payment will be refunded.`
      : 'Seller declined the order. Your payment will be refunded.',
  order_cancelled: (meta) =>
    meta?.reason === 'seller_timeout'
      ? 'Order automatically cancelled. Seller did not respond within 24 hours. Your payment will be refunded.'
      : meta?.reason
        ? `Order cancelled: ${meta.reason}. Your payment will be refunded.`
        : 'Order cancelled. Your payment will be refunded.',
  order_shipped: (meta) =>
    meta?.terminal
      ? `Package has been shipped. Dropped off at ${meta.terminal}.`
      : 'Package has been shipped.',
  order_in_transit: (meta) =>
    meta?.destination
      ? `Package is in transit to ${meta.destination}.`
      : 'Package is in transit.',
  order_delivered: (meta) =>
    meta?.terminal
      ? `Package delivered to ${meta.terminal}. You have 3 days to pick it up and confirm receipt.`
      : 'Package delivered. Please confirm receipt.',
  order_completed: () =>
    'Order completed. Thank you for using Second Turn Games!',
  receipt_confirmed: () =>
    'Buyer confirmed receipt. Order is now complete.',
  issue_reported: (meta) =>
    meta?.category
      ? `Issue reported: ${meta.category}. Our team will review and respond.`
      : 'Issue reported. Our team will review and respond.',
  staff_note: (meta) => meta?.note || 'Staff note added.',
  refund_processed: (meta) =>
    meta?.amount
      ? `Refund of €${meta.amount} has been processed. It may take 5-10 business days to appear.`
      : 'Refund has been processed. It may take 5-10 business days to appear.',
};

/**
 * Get or create a transaction conversation for an order.
 * Uses the database function for atomic operation.
 */
export async function getOrCreateTransactionConversation(
  orderId: string
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc(
    'get_or_create_transaction_conversation',
    { p_order_id: orderId }
  );

  if (error) {
    console.error(
      'Failed to get/create transaction conversation:',
      error.message
    );
    throw new Error(`Failed to get/create conversation: ${error.message}`);
  }

  return data as string;
}

/**
 * Post a system message to a transaction conversation.
 *
 * @param orderId - The order ID
 * @param type - The system message type
 * @param metadata - Optional metadata for message template
 * @returns The created message ID
 */
export async function postSystemMessage(
  orderId: string,
  type: SystemMessageType,
  metadata?: Record<string, string>
): Promise<string> {
  const supabase = createServiceClient();

  // Generate message content from template
  const content = SYSTEM_MESSAGE_TEMPLATES[type](metadata);

  // Use the database function for atomic operation
  const { data, error } = await supabase.rpc('post_transaction_system_message', {
    p_order_id: orderId,
    p_message_type: type,
    p_content: content,
  });

  if (error) {
    console.error('Failed to post system message:', error.message);
    throw new Error(`Failed to post system message: ${error.message}`);
  }

  return data as string;
}

/**
 * Post a system message without throwing on error.
 * Logs the error but allows the calling operation to continue.
 * Use this when the system message is non-critical.
 */
export async function postSystemMessageSafe(
  orderId: string,
  type: SystemMessageType,
  metadata?: Record<string, string>
): Promise<string | null> {
  try {
    return await postSystemMessage(orderId, type, metadata);
  } catch (error) {
    console.error(`Non-critical: Failed to post ${type} system message for order ${orderId}:`, error);
    return null;
  }
}

/**
 * Helper to post order created message
 */
export async function postOrderCreatedMessage(orderId: string): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_created');
}

/**
 * Helper to post order accepted message
 */
export async function postOrderAcceptedMessage(
  orderId: string,
  shippingMethod: 'local_pickup' | 't2t',
  labelGenerated?: boolean
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_accepted', {
    shippingMethod,
    ...(labelGenerated !== undefined && { labelGenerated: String(labelGenerated) }),
  });
}

/**
 * Helper to post order declined message
 */
export async function postOrderDeclinedMessage(
  orderId: string,
  reason?: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_declined', reason ? { reason } : undefined);
}

/**
 * Helper to post order cancelled message
 */
export async function postOrderCancelledMessage(
  orderId: string,
  reason?: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_cancelled', reason ? { reason } : undefined);
}

/**
 * Helper to post order shipped message
 */
export async function postOrderShippedMessage(
  orderId: string,
  terminal?: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_shipped', terminal ? { terminal } : undefined);
}

/**
 * Helper to post order in transit message
 */
export async function postOrderInTransitMessage(
  orderId: string,
  destination?: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_in_transit', destination ? { destination } : undefined);
}

/**
 * Helper to post order delivered message
 */
export async function postOrderDeliveredMessage(
  orderId: string,
  terminal?: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_delivered', terminal ? { terminal } : undefined);
}

/**
 * Helper to post order completed message
 */
export async function postOrderCompletedMessage(orderId: string): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'order_completed');
}

/**
 * Helper to post receipt confirmed message
 */
export async function postReceiptConfirmedMessage(orderId: string): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'receipt_confirmed');
}

/**
 * Helper to post issue reported message
 */
export async function postIssueReportedMessage(
  orderId: string,
  category: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'issue_reported', { category });
}

/**
 * Helper to post refund processed message
 */
export async function postRefundProcessedMessage(
  orderId: string,
  amount?: string
): Promise<string | null> {
  return postSystemMessageSafe(orderId, 'refund_processed', amount ? { amount } : undefined);
}
