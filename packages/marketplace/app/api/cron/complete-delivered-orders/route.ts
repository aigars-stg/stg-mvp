import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postOrderCompletedMessage } from '@/lib/transactions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/complete-delivered-orders
 *
 * Cron job to auto-complete delivered orders after 3 days
 * This allows buyers time to report issues before releasing payment
 *
 * Authorization: Bearer token (from Vercel Cron or manual trigger)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (required in all environments)
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
      console.error('[Cron] Unauthorized order completion attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 [Cron] Checking for delivered orders to complete...');

    // Find orders delivered more than 3 days ago that haven't been completed
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('status', 'delivered')
      .lt('updated_at', threeDaysAgo.toISOString());

    if (fetchError) {
      console.error('❌ [Cron] Error fetching orders:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      console.log('✅ [Cron] No orders to complete');
      return NextResponse.json({
        success: true,
        completedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📦 [Cron] Found ${orders.length} orders to complete`);

    // Mark orders as completed
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .in(
        'id',
        orders.map((o) => o.id)
      );

    if (updateError) {
      console.error('❌ [Cron] Error completing orders:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete orders', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [Cron] Completed ${orders.length} orders`);

    // Post system messages for each completed order (non-blocking)
    for (const order of orders) {
      postOrderCompletedMessage(order.id);
    }

    return NextResponse.json({
      success: true,
      completedCount: orders.length,
      completedOrders: orders.map((o) => o.order_number),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ [Cron] Order completion job failed:', error);
    return NextResponse.json(
      {
        error: 'Order completion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
