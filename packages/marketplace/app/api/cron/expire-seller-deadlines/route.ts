import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/expire-seller-deadlines
 *
 * Cron job to handle orders where sellers haven't responded within 24 hours
 * Cancels orders and triggers refunds
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
      console.error('[Cron] CRON_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
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

    console.log('🕐 [Cron] Running expire-seller-deadlines job...');

    // Call the expiration handler function
    const { data: result, error } = await supabase.rpc(
      'handle_expired_seller_deadlines'
    );

    if (error) {
      console.error('❌ [Cron] Error handling expired deadlines:', error);
      return NextResponse.json(
        { error: 'Failed to handle expired deadlines', details: error.message },
        { status: 500 }
      );
    }

    const cancelledCount = result?.cancelled_count || 0;
    const refundsNeeded = result?.refunds_needed || [];

    console.log(`✅ [Cron] Cancelled ${cancelledCount} orders with expired deadlines`);

    // Process refunds and send emails
    let refundsProcessed = 0;
    let refundsFailed = 0;
    let emailsSent = 0;

    if (refundsNeeded.length > 0) {
      console.log(`💰 [Cron] Processing ${refundsNeeded.length} refunds...`);

      // Import stripe, email, and transaction message functions
      const { stripe } = await import('@/lib/stripe');
      const { sendOrderCancelledToBuyer } = await import('@/lib/email/send-order-emails');
      const { postOrderCancelledMessage } = await import('@/lib/transactions');

      for (const refundInfo of refundsNeeded) {
        const { order_id, buyer_id, amount, payment_intent_id } = refundInfo;

        // Post system message to transaction conversation (non-blocking)
        postOrderCancelledMessage(order_id, 'seller_timeout');

        // Process Stripe refund
        if (payment_intent_id) {
          try {
            console.log(`💰 [Cron] Refunding order ${order_id}...`);

            const refund = await stripe.refunds.create({
              payment_intent: payment_intent_id,
              reason: 'requested_by_customer',
              metadata: {
                order_id,
                reason: 'Seller did not respond within 24 hours',
              },
            });

            console.log(`✅ [Cron] Refund created: ${refund.id}`);

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
            console.error(`❌ [Cron] Refund failed for order ${order_id}:`, refundError);
            refundsFailed++;
            continue;
          }
        }

        // Fetch order details for email
        const { data: order } = await supabase
          .from('orders')
          .select('order_number, seller_id')
          .eq('id', order_id)
          .single();

        if (!order) continue;

        // Fetch buyer and seller profiles
        const { data: buyerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', buyer_id)
          .single();

        const { data: sellerProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', order.seller_id)
          .single();

        // Send cancellation email
        if (buyerProfile && sellerProfile) {
          try {
            await sendOrderCancelledToBuyer({
              buyerName: buyerProfile.full_name,
              buyerEmail: buyerProfile.email,
              orderNumber: order.order_number,
              sellerName: sellerProfile.full_name,
              refundAmount: amount,
              cancellationReason: 'Seller did not respond within 24 hours',
            });

            console.log(`📧 [Cron] Cancellation email sent for order ${order_id}`);
            emailsSent++;
          } catch (emailError) {
            console.error(`❌ [Cron] Email failed for order ${order_id}:`, emailError);
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
          console.log(`⏰ [Cron] Dispute deadline expired for order ${dispute.order_number}`);
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

    console.log('✅ [Cron] Summary:', summary);

    return NextResponse.json(summary);
  } catch (error: unknown) {
    console.error('❌ [Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export const POST = GET;
