import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/api/error-handler';
import { loggers } from '@/lib/logger';
import { calculateEverypayPortionCents, determineReleaseAction } from '@/lib/services/payment-capture';

const log = loggers.cron;

/**
 * GET /api/cron/expire-seller-deadlines
 *
 * Cron job to handle orders where sellers haven't responded within 24 hours
 * Cancels orders and triggers refunds (EveryPay + wallet)
 * Should run every 5 minutes via Vercel Cron
 *
 * Add to vercel.json:
 * "crons": [{ "path": "/api/cron/expire-seller-deadlines", "schedule": "every 5 minutes" }]
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (required in all environments)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      throw new Error('CRON_SECRET environment variable not set');
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      log.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    log.info('Running expire-seller-deadlines job');

    // Call the expiration handler function
    const { data: result, error } = await supabase.rpc(
      'handle_expired_seller_deadlines'
    );

    if (error) {
      throw new Error(`Failed to handle expired deadlines: ${error.message}`);
    }

    const cancelledCount = result?.cancelled_count || 0;
    const refundsNeeded = result?.refunds_needed || [];

    log.info({ cancelledCount }, 'Cancelled orders with expired deadlines');

    // Process refunds and send emails
    let refundsProcessed = 0;
    let refundsFailed = 0;
    let emailsSent = 0;

    if (refundsNeeded.length > 0) {
      log.info({ count: refundsNeeded.length }, 'Processing refunds');

      // Import EveryPay client, wallet service, email, and transaction message functions
      const { refundPayment, voidPayment } = await import('@/lib/everypay/client');
      const { refundToWallet } = await import('@/lib/services/wallet');
      const { sendOrderCancelledToBuyer } = await import('@/lib/email/send-order-emails');
      const { postOrderCancelledMessage } = await import('@/lib/transactions');

      for (const refundInfo of refundsNeeded) {
        const { order_id, buyer_id, amount } = refundInfo;

        // Post system message to transaction conversation (non-blocking)
        postOrderCancelledMessage(order_id, 'seller_timeout');

        try {
          log.info({ orderId: order_id }, 'Refunding order');

          // Fetch order details for EveryPay reference and wallet debit
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('everypay_payment_reference, everypay_payment_state, buyer_wallet_debit_cents, total_amount')
            .eq('id', order_id)
            .single();

          if (orderError || !order) {
            log.error({ orderId: order_id, orderError }, 'Could not fetch order');
            refundsFailed++;
            continue;
          }

          const everypayPortionCents = calculateEverypayPortionCents(order.total_amount, order.buyer_wallet_debit_cents);
          const walletDebitCents = order.buyer_wallet_debit_cents || 0;
          const releaseAction = determineReleaseAction(order.everypay_payment_state, order.everypay_payment_reference, everypayPortionCents);

          // 1. Release EveryPay funds: void if pre-authorised, refund if already settled
          if (releaseAction === 'void') {
            try {
              await voidPayment(order.everypay_payment_reference!);
              log.info({ orderId: order_id }, 'EveryPay authorization voided');
            } catch {
              // If void fails (e.g., auto-captured), fall back to refund
              await refundPayment(order.everypay_payment_reference!, everypayPortionCents);
              log.info({ orderId: order_id, amountCents: everypayPortionCents }, 'EveryPay refund processed (void failed)');
            }
          } else if (releaseAction === 'refund') {
            await refundPayment(order.everypay_payment_reference!, everypayPortionCents);
            log.info({ orderId: order_id, amountCents: everypayPortionCents }, 'EveryPay refund processed');
          }

          // 2. Refund wallet portion back to buyer's wallet
          if (walletDebitCents > 0) {
            const walletResult = await refundToWallet(
              supabase,
              buyer_id,
              walletDebitCents,
              order_id
            );
            if (!walletResult.success) {
              log.error({ orderId: order_id, error: walletResult.error }, 'Wallet refund failed');
              refundsFailed++;
              continue;
            }
            log.info({ orderId: order_id, amountCents: walletDebitCents }, 'Wallet refund processed');
          }

          // Update order with refund info
          await supabase
            .from('orders')
            .update({
              refunded_at: new Date().toISOString(),
              refund_amount: amount,
            })
            .eq('id', order_id);

          refundsProcessed++;
        } catch (refundError: unknown) {
          log.error({ orderId: order_id, error: refundError }, 'Refund failed');
          refundsFailed++;
          continue;
        }

        // Fetch order details for email
        const { data: orderForEmail } = await supabase
          .from('orders')
          .select('order_number, seller_id')
          .eq('id', order_id)
          .single();

        if (!orderForEmail) continue;

        // Fetch buyer and seller profiles
        const { data: buyerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', buyer_id)
          .single();

        const { data: sellerProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', orderForEmail.seller_id)
          .single();

        // Send cancellation email
        if (buyerProfile && sellerProfile) {
          try {
            await sendOrderCancelledToBuyer({
              buyerName: buyerProfile.full_name,
              buyerEmail: buyerProfile.email,
              orderNumber: orderForEmail.order_number,
              sellerName: sellerProfile.full_name,
              refundAmount: amount,
              cancellationReason: 'Seller did not respond within 24 hours',
            });

            log.info({ orderId: order_id }, 'Cancellation email sent');
            emailsSent++;
          } catch (emailError) {
            log.error({ orderId: order_id, error: emailError }, 'Email failed');
          }
        }
      }
    }

    // Also handle expired dispute response deadlines
    let disputeDeadlinesExpired = 0;
    const { data: expiredDisputes } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('status', 'disputed')
      .eq('dispute_status', 'awaiting_seller')
      .is('dispute_seller_responded_at', null)
      .lt('dispute_seller_deadline', new Date().toISOString());

    if (expiredDisputes && expiredDisputes.length > 0) {
      for (const dispute of expiredDisputes) {
        const { error: dErr } = await supabase
          .from('orders')
          .update({
            dispute_status: 'under_review',
            dispute_resolution_note: 'Seller did not respond within the 48-hour deadline.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', dispute.id);

        if (!dErr) {
          disputeDeadlinesExpired++;
          log.info({ orderNumber: dispute.order_number }, 'Dispute deadline expired');
        }
      }
    }

    const summary = {
      success: true,
      cancelledCount,
      refundsProcessed,
      refundsFailed,
      emailsSent,
      disputeDeadlinesExpired,
      timestamp: new Date().toISOString(),
    };

    log.info(summary, 'expire-seller-deadlines completed');

    return NextResponse.json(summary);
  } catch (error: unknown) {
    return handleApiError(error, 'Expire seller deadlines');
  }
}

// Also support POST for manual triggers
export const POST = GET;
