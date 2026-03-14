import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postOrderCompletedMessage } from '@/lib/transactions';
import { handleApiError } from '@/lib/api/error-handler';
import { creditSellerWallet } from '@/lib/services/wallet';
import {
  sendOrderCompletedToBuyer,
  sendOrderCompletedToSeller,
} from '@/lib/email/send-order-emails';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/complete-delivered-orders
 *
 * Cron job to auto-complete delivered orders after 2-day dispute window
 * This allows buyers time to report issues before releasing payment to seller
 *
 * Authorization: Bearer token (from Vercel Cron or manual trigger)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (required in all environments)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      throw new Error('CRON_SECRET environment variable not set');
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized order completion attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 [Cron] Checking for delivered orders to complete...');

    // Find orders delivered more than 2 days ago that haven't been completed
    // Uses delivered_at if set, otherwise falls back to updated_at
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Query delivered orders that have no open disputes or issues
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, delivered_at, updated_at, dispute_status, buyer_id, seller_id')
      .eq('status', 'delivered')
      .is('dispute_status', null);

    // Filter in JS to handle COALESCE(delivered_at, updated_at) logic
    // Also exclude orders with open order_issues
    const candidateOrders = orders?.filter((order) => {
      const deliveryDate = new Date(order.delivered_at || order.updated_at);
      return deliveryDate < twoDaysAgo;
    }) || [];

    // Check for open issues on candidate orders
    const orderIds = candidateOrders.map(o => o.id);
    let ordersWithOpenIssues: Set<string> = new Set();
    if (orderIds.length > 0) {
      const { data: openIssues } = await supabase
        .from('order_issues')
        .select('order_id')
        .in('order_id', orderIds)
        .in('status', ['open', 'investigating']);
      if (openIssues) {
        ordersWithOpenIssues = new Set(openIssues.map(i => i.order_id));
      }
    }

    const ordersToComplete = candidateOrders.filter(o => !ordersWithOpenIssues.has(o.id));

    // Re-assign for compatibility with rest of code
    const fetchErrorToUse = fetchError;

    if (fetchErrorToUse) {
      throw new Error(`Failed to fetch orders: ${fetchErrorToUse.message}`);
    }

    if (ordersToComplete.length === 0) {
      console.log('✅ [Cron] No orders to complete');
      return NextResponse.json({
        success: true,
        completedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📦 [Cron] Found ${ordersToComplete.length} orders to complete`);

    // Complete each order individually with an atomic status guard.
    // This prevents racing with concurrent refund requests — the update
    // only succeeds if the order is still in 'delivered' status.
    let completedCount = 0;
    let walletSuccessCount = 0;
    let walletFailCount = 0;
    let skippedCount = 0;

    for (const order of ordersToComplete) {
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('status', 'delivered') // atomic guard: only update if still delivered
        .select('id')
        .single();

      if (updateError || !updated) {
        // Order status changed between select and update (e.g. refunded concurrently)
        console.log(`[Cron] Skipped order ${order.order_number} — status changed before completion`);
        skippedCount++;
        continue;
      }

      completedCount++;

      // Only credit wallet if status transition succeeded
      const walletResult = await creditSellerWallet(supabase, order.id);
      if (walletResult.success) {
        walletSuccessCount++;
      } else {
        walletFailCount++;
        console.error(`[Cron] Wallet credit failed for order ${order.id}: ${walletResult.error}`);
      }

      // Post system message (non-blocking)
      postOrderCompletedMessage(order.id);

      // Create in-app notifications for buyer and seller (non-blocking)
      supabase.rpc('create_notification', {
        p_user_id: order.buyer_id,
        p_type: 'order_completed',
        p_title: `Order #${order.order_number} is complete`,
        p_body: 'Your order has been finalized. We hope you enjoy your game.',
        p_data: { order_id: order.id },
      }).then(({ error: notifErr }) => {
        if (notifErr) console.error(`[Cron] Buyer notification failed for order ${order.id}:`, notifErr);
      });

      supabase.rpc('create_notification', {
        p_user_id: order.seller_id,
        p_type: 'order_completed',
        p_title: `Sale complete - Order #${order.order_number}`,
        p_body: 'The order has been finalized and your earnings have been credited to your wallet.',
        p_data: { order_id: order.id },
      }).then(({ error: notifErr }) => {
        if (notifErr) console.error(`[Cron] Seller notification failed for order ${order.id}:`, notifErr);
      });

      // Send completion emails (non-blocking, fire-and-forget)
      // Fetch participant profiles for email addresses
      Promise.all([
        supabase.from('user_profiles').select('full_name, email').eq('id', order.buyer_id).single(),
        supabase.from('user_profiles').select('full_name, email').eq('id', order.seller_id).single(),
      ]).then(([{ data: buyerProfile }, { data: sellerProfile }]) => {
        if (buyerProfile) {
          sendOrderCompletedToBuyer({
            buyerName: buyerProfile.full_name,
            buyerEmail: buyerProfile.email,
            orderNumber: order.order_number,
            orderId: order.id,
            sellerName: sellerProfile?.full_name || 'Seller',
          }).catch(() => {});
        }
        if (sellerProfile) {
          sendOrderCompletedToSeller({
            sellerName: sellerProfile.full_name,
            sellerEmail: sellerProfile.email,
            orderNumber: order.order_number,
            orderId: order.id,
          }).catch(() => {});
        }
      }).catch((err: unknown) => console.error(`[Cron] Email fetch failed for order ${order.id}:`, err));
    }

    console.log(`✅ [Cron] Completed ${completedCount} orders (${skippedCount} skipped due to status change)`);

    if (walletFailCount > 0) {
      console.warn(`[Cron] Wallet credits: ${walletSuccessCount} succeeded, ${walletFailCount} failed`);
    }

    return NextResponse.json({
      success: true,
      completedCount,
      skippedCount,
      walletCredits: { succeeded: walletSuccessCount, failed: walletFailCount },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Complete delivered orders');
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
