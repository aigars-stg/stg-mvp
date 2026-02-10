import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/api/error-handler';

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
      console.error('[Cron] Unauthorized cron request');
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

    console.log('[Cron] Running expire-seller-deadlines job...');

    // Call the expiration handler function
    const { data: result, error } = await supabase.rpc(
      'handle_expired_seller_deadlines'
    );

    if (error) {
      throw new Error(`Failed to handle expired deadlines: ${error.message}`);
    }

    const cancelledCount = result?.cancelled_count || 0;
    const refundsNeeded = result?.refunds_needed || [];

    console.log(`[Cron] Cancelled ${cancelledCount} orders with expired deadlines`);

    // Process refunds and send emails
    let refundsProcessed = 0;
    let refundsFailed = 0;
    let emailsSent = 0;

    if (refundsNeeded.length > 0) {
      console.log(`[Cron] Processing ${refundsNeeded.length} refunds...`);

      // Import EveryPay client, wallet service, email, and transaction message functions
      const { refundPayment } = await import('@/lib/everypay/client');
      const { refundToWallet } = await import('@/lib/services/wallet');
      const { sendOrderCancelledToBuyer } = await import('@/lib/email/send-order-emails');
      const { postOrderCancelledMessage } = await import('@/lib/transactions');

      for (const refundInfo of refundsNeeded) {
        const { order_id, buyer_id, amount } = refundInfo;

        // Post system message to transaction conversation (non-blocking)
        postOrderCancelledMessage(order_id, 'seller_timeout');

        try {
          console.log(`[Cron] Refunding order ${order_id}...`);

          // Fetch order details for EveryPay reference and wallet debit
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('everypay_payment_reference, buyer_wallet_debit_cents, total_amount')
            .eq('id', order_id)
            .single();

          if (orderError || !order) {
            console.error(`[Cron] Could not fetch order ${order_id}:`, orderError);
            refundsFailed++;
            continue;
          }

          const totalAmountCents = Math.round(order.total_amount * 100);
          const walletDebitCents = order.buyer_wallet_debit_cents || 0;
          const everypayPortionCents = totalAmountCents - walletDebitCents;

          // 1. Refund EveryPay portion (card payment)
          if (everypayPortionCents > 0 && order.everypay_payment_reference) {
            await refundPayment(order.everypay_payment_reference, everypayPortionCents);
            console.log(`[Cron] EveryPay refund processed for order ${order_id} (${everypayPortionCents} cents)`);
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
              console.error(`[Cron] Wallet refund failed for order ${order_id}:`, walletResult.error);
              refundsFailed++;
              continue;
            }
            console.log(`[Cron] Wallet refund processed for order ${order_id} (${walletDebitCents} cents)`);
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
          console.error(`[Cron] Refund failed for order ${order_id}:`, refundError);
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

            console.log(`[Cron] Cancellation email sent for order ${order_id}`);
            emailsSent++;
          } catch (emailError) {
            console.error(`[Cron] Email failed for order ${order_id}:`, emailError);
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
          console.log(`[Cron] Dispute deadline expired for order ${dispute.order_number}`);
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

    console.log('[Cron] Summary:', summary);

    return NextResponse.json(summary);
  } catch (error: unknown) {
    return handleApiError(error, 'Expire seller deadlines');
  }
}

// Also support POST for manual triggers
export const POST = GET;
