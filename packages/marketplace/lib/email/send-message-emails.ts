/**
 * Email utilities for transaction message notifications
 */

import { sendEmail } from './resend';
import { NewMessageEmail } from './templates/new-message';
import { createServiceClient } from '@/lib/supabase/client';

interface SendNewMessageEmailParams {
  recipientId: string;
  senderId: string;
  orderId: string;
  messageContent: string;
  hasPhotos: boolean;
}

/**
 * Send a notification email when a new message is received in a transaction
 *
 * @param params - Message notification parameters
 * @returns True if email was sent successfully, false otherwise
 */
export async function sendNewMessageEmail(
  params: SendNewMessageEmailParams
): Promise<boolean> {
  const { recipientId, senderId, orderId, messageContent, hasPhotos } = params;

  try {
    const supabase = createServiceClient();

    // Fetch recipient profile
    const { data: recipient, error: recipientError } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipient || !recipient.email) {
      console.warn(`[MessageEmail] Recipient ${recipientId} not found or has no email`);
      return false;
    }

    // Fetch sender profile
    const { data: sender, error: senderError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', senderId)
      .single();

    if (senderError || !sender) {
      console.warn(`[MessageEmail] Sender ${senderId} not found`);
      return false;
    }

    // Fetch order for order number
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.warn(`[MessageEmail] Order ${orderId} not found`);
      return false;
    }

    // Build order URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://secondturn.games';
    const transactionUrl = `${baseUrl}/orders/${orderId}`;

    // Send email
    await sendEmail({
      to: recipient.email,
      subject: `New message from ${sender.full_name || 'a user'} about order #${order.order_number}`,
      react: NewMessageEmail({
        recipientName: recipient.full_name || 'User',
        senderName: sender.full_name || 'User',
        orderNumber: order.order_number,
        messagePreview: messageContent,
        hasPhotos,
        transactionUrl,
      }),
    });

    console.log(`✅ [MessageEmail] Sent notification to ${recipient.email} for order ${order.order_number}`);
    return true;
  } catch (error) {
    console.error('[MessageEmail] Failed to send notification:', error);
    return false;
  }
}

/**
 * Send a notification for a new message (non-blocking)
 * This is a fire-and-forget version that won't throw errors
 */
export function sendNewMessageEmailAsync(
  params: SendNewMessageEmailParams
): void {
  // Don't send emails for empty messages (photo-only messages are OK if hasPhotos is true)
  if (!params.messageContent && !params.hasPhotos) {
    return;
  }

  // Fire and forget - don't block the main request
  sendNewMessageEmail(params).catch((error) => {
    console.error('[MessageEmail] Async send failed:', error);
  });
}
