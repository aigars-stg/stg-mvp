/**
 * Order email sending service
 * SERVER-ONLY: This file should only be imported in API routes
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from './resend';
import { OrderPlacedSellerEmail } from './templates/order-placed-seller';
import { OrderConfirmationBuyerEmail } from './templates/order-confirmation-buyer';
import { OrderAcceptedBuyerEmail } from './templates/order-accepted-buyer';
import { OrderCancelledBuyerEmail } from './templates/order-cancelled-buyer';
import { ShippingLabelSellerEmail } from './templates/shipping-label-seller';
import { PackageDeliveredBuyerEmail } from './templates/package-delivered-buyer';
import { DisputeOpenedSellerEmail } from './templates/dispute-opened-seller';
import { DisputeOpenedBuyerEmail } from './templates/dispute-opened-buyer';
import { DisputeSellerResponseEmail } from './templates/dispute-seller-response';
import { DisputeSellerAcceptedEmail } from './templates/dispute-seller-accepted';
import { DisputeSellerDeadlinePassedEmail } from './templates/dispute-seller-deadline-passed';
import { DisputeResolvedEmail } from './templates/dispute-resolved';
import { RefundCompletedEmail } from './templates/refund-completed';
import { ShippingReminderEmail } from './templates/shipping-reminder';
import { ShippingDeadlineCancelledEmail } from './templates/shipping-deadline-cancelled';
import { SepaRefundRequiredEmail } from './templates/sepa-refund-required';
import { DisputeEscalatedStaffEmail } from './templates/dispute-escalated-staff';
import { loggers } from '../logger';

const STAFF_EMAIL = 'info@secondturn.games';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production');
  }
  return 'http://localhost:3001';
})();

interface OrderEmailData {
  orderNumber: string;
  orderId: string;
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  buyerEmail: string;
  itemCount: number;
  totalAmount: number;
  shippingMethod: 't2t' | 'local_pickup';
  destinationInfo: string; // Terminal name or pickup city
}

/**
 * Send order placed notification to seller
 */
export async function sendOrderPlacedToSeller(data: OrderEmailData) {
  const { sellerName, sellerEmail, orderNumber, orderId, itemCount, totalAmount, buyerName, shippingMethod, destinationInfo } = data;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `New Order #${orderNumber} - Action Required`,
      react: OrderPlacedSellerEmail({
        sellerName,
        orderNumber,
        itemCount,
        totalAmount,
        buyerName,
        shippingMethod,
        destinationInfo,
        orderUrl: `${APP_URL}/orders/${orderId}`,
        deadlineHours: 24,
      }),
    });

    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, sellerEmail, error }, 'Failed to send order placed email to seller');
    return { success: false, error };
  }
}

/**
 * Send order confirmation to buyer
 */
export async function sendOrderConfirmationToBuyer(data: OrderEmailData) {
  const { buyerName, buyerEmail, orderNumber, orderId, sellerName, itemCount, totalAmount, shippingMethod, destinationInfo } = data;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `Order Confirmed #${orderNumber}`,
      react: OrderConfirmationBuyerEmail({
        buyerName,
        orderNumber,
        sellerName,
        itemCount,
        totalAmount,
        shippingMethod,
        destinationInfo,
        orderUrl: `${APP_URL}/orders/${orderId}`,
      }),
    });

    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send order confirmation to buyer');
    return { success: false, error };
  }
}

/**
 * Send order accepted notification to buyer
 */
export async function sendOrderAcceptedToBuyer(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  orderId: string;
  sellerName: string;
  shippingMethod: 't2t' | 'local_pickup';
  destinationInfo: string;
  trackingNumber?: string;
  trackingUrl?: string;
}) {
  const { buyerName, buyerEmail, orderNumber, orderId, sellerName, shippingMethod, destinationInfo, trackingNumber, trackingUrl } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `Great News! Order #${orderNumber} Accepted`,
      react: OrderAcceptedBuyerEmail({
        buyerName,
        orderNumber,
        sellerName,
        shippingMethod,
        destinationInfo,
        trackingNumber,
        trackingUrl,
        orderUrl: `${APP_URL}/orders/${orderId}`,
      }),
    });

    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send order accepted email to buyer');
    return { success: false, error };
  }
}

/**
 * Send order cancelled notification to buyer
 */
export async function sendOrderCancelledToBuyer(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  sellerName: string;
  refundAmount: number;
  cancellationReason: string;
}) {
  const { buyerName, buyerEmail, orderNumber, sellerName, refundAmount, cancellationReason } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `Order #${orderNumber} Cancelled - Refund Processed`,
      react: OrderCancelledBuyerEmail({
        buyerName,
        orderNumber,
        sellerName,
        refundAmount,
        cancellationReason,
        browseUrl: `${APP_URL}/browse`,
      }),
    });

    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send order cancelled email to buyer');
    return { success: false, error };
  }
}

/**
 * Send shipping notification to seller with parcel ID
 * Seller will print the label at the Unisend terminal
 */
export async function sendShippingLabelToSeller(params: {
  sellerName: string;
  sellerEmail: string;
  orderNumber: string;
  orderId: string;
  buyerName: string;
  destinationTerminalName: string;
  destinationTerminalAddress: string;
  parcelId: string;
  barcode?: string;
  trackingUrl?: string;
}) {
  const {
    sellerName,
    sellerEmail,
    orderNumber,
    orderId,
    buyerName,
    destinationTerminalName,
    destinationTerminalAddress,
    parcelId,
    barcode,
    trackingUrl,
  } = params;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `Ready to Ship - Order #${orderNumber}`,
      react: ShippingLabelSellerEmail({
        sellerName,
        orderNumber,
        buyerName,
        destinationTerminalName,
        destinationTerminalAddress,
        parcelId,
        barcode,
        trackingUrl,
        orderUrl: `${APP_URL}/orders/${orderId}`,
      }),
    });

    loggers.email.info({ orderNumber, sellerEmail }, 'Shipping notification sent to seller');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, sellerEmail, error }, 'Failed to send shipping notification to seller');
    return { success: false, error };
  }
}

/**
 * Send package delivered notification to buyer
 */
export async function sendPackageDeliveredToBuyer(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  orderId: string;
  sellerName: string;
  destinationTerminalName: string;
  destinationTerminalAddress: string;
  barcode: string;
}) {
  const {
    buyerName,
    buyerEmail,
    orderNumber,
    orderId,
    sellerName,
    destinationTerminalName,
    destinationTerminalAddress,
    barcode,
  } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `📦 Package Delivered - Order #${orderNumber}`,
      react: PackageDeliveredBuyerEmail({
        buyerName,
        orderNumber,
        sellerName,
        destinationTerminalName,
        destinationTerminalAddress,
        barcode,
        orderUrl: `${APP_URL}/orders/${orderId}`,
        reviewUrl: `${APP_URL}/orders/${orderId}/review`,
      }),
    });

    loggers.email.info({ orderNumber, buyerEmail }, 'Package delivered notification sent to buyer');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send package delivered email to buyer');
    return { success: false, error };
  }
}

/**
 * Send dispute opened notification to seller
 */
export async function sendDisputeOpenedToSeller(params: {
  sellerName: string;
  sellerEmail: string;
  orderNumber: string;
  orderId: string;
  gameName: string;
  buyerReason: string;
}) {
  const { sellerName, sellerEmail, orderNumber, orderId, gameName, buyerReason } = params;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `Action required: Dispute opened for Order #${orderNumber}`,
      react: DisputeOpenedSellerEmail({
        sellerName,
        orderNumber,
        gameName,
        buyerReason,
        deadlineHours: 48,
        respondUrl: `${APP_URL}/orders/${orderId}`,
      }),
    });

    loggers.email.info({ orderNumber, sellerEmail }, 'Dispute notification sent to seller');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, sellerEmail, error }, 'Failed to send dispute notification to seller');
    return { success: false, error };
  }
}

/**
 * Fetch order participants and send both the buyer confirmation and seller
 * notification emails for a newly-created order.
 *
 * Used by both the EveryPay callback handler and the wallet-only checkout
 * path so that buyers always receive a confirmation regardless of payment
 * method.
 *
 * @param supabase - A service-role Supabase client (needs cross-user reads)
 * @param orderId  - UUID of the newly created order
 * @param params   - Must contain buyerId and sellerId
 */
export async function sendOrderEmails(
  supabase: SupabaseClient,
  orderId: string,
  params: { buyerId: string; sellerId: string }
): Promise<void> {
  const { buyerId, sellerId } = params;

  const [{ data: buyerProfile }, { data: sellerProfile }, { data: order }] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', buyerId)
        .single(),
      supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', sellerId)
        .single(),
      supabase
        .from('orders')
        .select('order_number, shipping_method, destination_terminal_name, pickup_city, total_amount, order_items(id)')
        .eq('id', orderId)
        .single(),
    ]);

  if (!buyerProfile || !sellerProfile || !order) return;

  const emailData = {
    orderNumber: order.order_number,
    orderId,
    sellerName: sellerProfile.full_name,
    sellerEmail: sellerProfile.email,
    buyerName: buyerProfile.full_name,
    buyerEmail: buyerProfile.email,
    itemCount: order.order_items?.length || 1,
    totalAmount: order.total_amount,
    shippingMethod: order.shipping_method as 't2t' | 'local_pickup',
    destinationInfo:
      order.shipping_method === 't2t'
        ? order.destination_terminal_name || ''
        : order.pickup_city || '',
  };

  await Promise.allSettled([
    sendOrderPlacedToSeller(emailData),
    sendOrderConfirmationToBuyer(emailData),
  ]);
}

/**
 * Send dispute resolved notification to buyer or seller
 */
export async function sendDisputeResolved(params: {
  recipientName: string;
  recipientEmail: string;
  orderNumber: string;
  resolution: string;
  resolutionNote: string;
  isSellerFavor: boolean;
}) {
  const { recipientName, recipientEmail, orderNumber, resolution, resolutionNote, isSellerFavor } = params;

  try {
    await sendEmail({
      to: recipientEmail,
      subject: `Dispute resolved for Order #${orderNumber}`,
      react: DisputeResolvedEmail({
        recipientName,
        orderNumber,
        resolution,
        resolutionNote,
        isSellerFavor,
      }),
    });

    loggers.email.info({ orderNumber, recipientEmail }, 'Dispute resolved email sent');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, recipientEmail, error }, 'Failed to send dispute resolved email');
    return { success: false, error };
  }
}

/**
 * Send dispute opened confirmation to buyer
 */
export async function sendDisputeOpenedToBuyer(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  orderId: string;
  disputeType: string;
}) {
  const { buyerName, buyerEmail, orderNumber, orderId, disputeType } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `We received your report for Order #${orderNumber}`,
      react: DisputeOpenedBuyerEmail({
        buyerName,
        orderNumber,
        disputeType,
        orderId,
      }),
    });

    loggers.email.info({ orderNumber, buyerEmail }, 'Dispute opened confirmation sent to buyer');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send dispute opened email to buyer');
    return { success: false, error };
  }
}

/**
 * Send notification to buyer that seller responded to dispute
 */
export async function sendDisputeSellerResponse(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  orderId: string;
}) {
  const { buyerName, buyerEmail, orderNumber, orderId } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `Seller responded to your dispute - Order #${orderNumber}`,
      react: DisputeSellerResponseEmail({
        buyerName,
        orderNumber,
        orderId,
      }),
    });

    loggers.email.info({ orderNumber, buyerEmail }, 'Dispute seller response notification sent to buyer');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send dispute seller response email');
    return { success: false, error };
  }
}

/**
 * Send notification to buyer that seller accepted their claim
 */
export async function sendDisputeSellerAccepted(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  orderId: string;
  refundAmount: string;
}) {
  const { buyerName, buyerEmail, orderNumber, orderId, refundAmount } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `Seller accepted your claim - Order #${orderNumber}`,
      react: DisputeSellerAcceptedEmail({
        buyerName,
        orderNumber,
        refundAmount,
        orderId,
      }),
    });

    loggers.email.info({ orderNumber, buyerEmail }, 'Dispute seller accepted notification sent to buyer');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send dispute seller accepted email');
    return { success: false, error };
  }
}

/**
 * Send notification to seller that their dispute deadline passed
 */
export async function sendDisputeSellerDeadlinePassed(params: {
  sellerName: string;
  sellerEmail: string;
  orderNumber: string;
}) {
  const { sellerName, sellerEmail, orderNumber } = params;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `Dispute deadline passed - Order #${orderNumber}`,
      react: DisputeSellerDeadlinePassedEmail({
        sellerName,
        orderNumber,
      }),
    });

    loggers.email.info({ orderNumber, sellerEmail }, 'Dispute deadline passed notification sent to seller');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, sellerEmail, error }, 'Failed to send dispute deadline passed email');
    return { success: false, error };
  }
}

/**
 * Send refund completed notification to buyer
 */
export async function sendRefundCompleted(params: {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  refundAmount: string;
  refundMethod: 'card' | 'bank' | 'wallet';
}) {
  const { buyerName, buyerEmail, orderNumber, refundAmount, refundMethod } = params;

  try {
    await sendEmail({
      to: buyerEmail,
      subject: `Refund processed - Order #${orderNumber}`,
      react: RefundCompletedEmail({
        buyerName,
        orderNumber,
        refundAmount,
        refundMethod,
      }),
    });

    loggers.email.info({ orderNumber, buyerEmail }, 'Refund completed email sent to buyer');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, buyerEmail, error }, 'Failed to send refund completed email');
    return { success: false, error };
  }
}

/**
 * Send staff notification that a manual SEPA refund is required
 * Called when a bank link payment needs refunding (EveryPay can't auto-refund bank links)
 */
export async function sendSepaRefundRequired(params: {
  orderNumber: string;
  orderId: string;
  refundAmountEuros: string;
  buyerName: string;
}) {
  const { orderNumber, orderId, refundAmountEuros, buyerName } = params;
  const staffEmail = STAFF_EMAIL;

  try {
    await sendEmail({
      to: staffEmail,
      subject: `Action required: Manual SEPA refund for Order #${orderNumber}`,
      react: SepaRefundRequiredEmail({
        orderNumber,
        orderId,
        refundAmountEuros,
        buyerName,
      }),
    });

    loggers.email.info({ orderNumber }, 'SEPA refund notification sent to staff');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, error }, 'Failed to send SEPA refund notification to staff');
    return { success: false, error };
  }
}

/**
 * Send staff notification when a dispute is escalated to under_review
 * Called when seller contests a claim or when the 48h deadline expires
 */
export async function sendDisputeEscalatedToStaff(params: {
  orderNumber: string;
  orderId: string;
  reason: string;
  buyerName: string;
  sellerName: string;
  totalAmountEuros: string;
  escalationReason: 'seller_contested' | 'seller_deadline_expired';
}) {
  const { orderNumber, orderId, reason, buyerName, sellerName, totalAmountEuros, escalationReason } = params;
  const staffEmail = STAFF_EMAIL;

  try {
    await sendEmail({
      to: staffEmail,
      subject: `Dispute needs review: Order #${orderNumber}`,
      react: DisputeEscalatedStaffEmail({
        orderNumber,
        orderId,
        reason,
        buyerName,
        sellerName,
        totalAmountEuros,
        escalationReason,
      }),
    });

    loggers.email.info({ orderNumber, escalationReason }, 'Dispute escalation notification sent to staff');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, error }, 'Failed to send dispute escalation notification to staff');
    return { success: false, error };
  }
}

/**
 * Send shipping reminder to seller (24h after accept, no ship event)
 */
export async function sendShippingReminder(params: {
  sellerName: string;
  sellerEmail: string;
  orderNumber: string;
  orderId: string;
  deadline: string;
}) {
  const { sellerName, sellerEmail, orderNumber, orderId, deadline } = params;

  try {
    await sendEmail({
      to: sellerEmail,
      subject: `Reminder: Ship Order #${orderNumber}`,
      react: ShippingReminderEmail({
        sellerName,
        orderNumber,
        deadline,
        orderId,
      }),
    });

    loggers.email.info({ orderNumber, sellerEmail }, 'Shipping reminder sent to seller');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, sellerEmail, error }, 'Failed to send shipping reminder');
    return { success: false, error };
  }
}

/**
 * Send shipping deadline cancelled notification to buyer or seller
 */
export async function sendShippingDeadlineCancelled(params: {
  recipientName: string;
  recipientEmail: string;
  orderNumber: string;
  isBuyer: boolean;
}) {
  const { recipientName, recipientEmail, orderNumber, isBuyer } = params;

  try {
    await sendEmail({
      to: recipientEmail,
      subject: `Order #${orderNumber} cancelled - seller did not ship`,
      react: ShippingDeadlineCancelledEmail({
        recipientName,
        orderNumber,
        isBuyer,
      }),
    });

    loggers.email.info({ orderNumber, recipientEmail }, 'Shipping deadline cancelled email sent');
    return { success: true };
  } catch (error) {
    loggers.email.error({ orderNumber, recipientEmail, error }, 'Failed to send shipping deadline cancelled email');
    return { success: false, error };
  }
}
