import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postOrderCompletedMessage } from '@/lib/transactions';
import { handleApiError } from '@/lib/api/error-handler';
import { creditSellerWallet } from '@/lib/services/wallet';

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
      .select('id, order_number, delivered_at, updated_at, dispute_status')
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

    // Mark orders as completed
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .in(
        'id',
        ordersToComplete.map((o) => o.id)
      );

    if (updateError) {
      throw new Error(`Failed to complete orders: ${updateError.message}`);
    }

    console.log(`✅ [Cron] Completed ${ordersToComplete.length} orders`);

    // Credit seller wallets for each completed order
    let walletSuccessCount = 0;
    let walletFailCount = 0;
    for (const order of ordersToComplete) {
      const walletResult = await creditSellerWallet(supabase, order.id);
      if (walletResult.success) {
        walletSuccessCount++;
      } else {
        walletFailCount++;
        console.error(`[Cron] Wallet credit failed for order ${order.id}: ${walletResult.error}`);
      }
    }

    if (walletFailCount > 0) {
      console.warn(`[Cron] Wallet credits: ${walletSuccessCount} succeeded, ${walletFailCount} failed`);
    }

    // Post system messages for each completed order (non-blocking)
    for (const order of ordersToComplete) {
      postOrderCompletedMessage(order.id);
    }

    return NextResponse.json({
      success: true,
      completedCount: ordersToComplete.length,
      completedOrders: ordersToComplete.map((o) => o.order_number),
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
