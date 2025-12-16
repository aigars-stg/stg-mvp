import { NextRequest, NextResponse } from 'next/server';
import { syncAllActiveOrders } from '@/lib/unisend/tracking-service';
import { sendPackageDeliveredToBuyer } from '@/lib/email/send-order-emails';
import { createClient } from '@supabase/supabase-js';

// Use service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/cron/sync-tracking
 *
 * Cron job to sync Unisend tracking events for active T2T orders
 * Runs every 30 minutes via Vercel Cron
 *
 * Authorization: Bearer token (from Vercel Cron or manual trigger)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [Cron] Unauthorized tracking sync attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 [Cron] Starting tracking sync job...');

    // Sync all active orders
    const result = await syncAllActiveOrders();

    console.log(`📦 [Cron] Processed ${result.totalProcessed} orders`);
    console.log(`✅ [Cron] Success: ${result.successCount}, Errors: ${result.errorCount}`);
    console.log(`📊 [Cron] Status changes: ${result.statusChanges.length}`);

    // Send emails for newly delivered packages
    const deliveryEmailResults = [];
    for (const change of result.statusChanges) {
      if (change.newStatus === 'delivered') {
        console.log(`📧 [Cron] Sending delivery email for ${change.orderNumber}`);

        // Fetch order details for email
        const { data: order } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            buyer_id,
            seller_id,
            destination_terminal_name,
            destination_terminal_address,
            barcode
          `)
          .eq('id', change.orderId)
          .single();

        if (order) {
          // Fetch buyer and seller profiles
          const { data: buyerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', order.buyer_id)
            .single();

          const { data: sellerProfile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', order.seller_id)
            .single();

          if (buyerProfile && sellerProfile) {
            const emailResult = await sendPackageDeliveredToBuyer({
              buyerName: buyerProfile.full_name,
              buyerEmail: buyerProfile.email,
              orderNumber: order.order_number,
              orderId: order.id,
              sellerName: sellerProfile.full_name,
              destinationTerminalName: order.destination_terminal_name || '',
              destinationTerminalAddress: order.destination_terminal_address || '',
              barcode: order.barcode || '',
            });

            deliveryEmailResults.push({
              orderNumber: order.order_number,
              success: emailResult.success,
            });
          }
        }
      }
    }

    console.log(`📧 [Cron] Sent ${deliveryEmailResults.length} delivery emails`);

    return NextResponse.json({
      success: true,
      totalProcessed: result.totalProcessed,
      successCount: result.successCount,
      errorCount: result.errorCount,
      statusChanges: result.statusChanges,
      deliveryEmailsSent: deliveryEmailResults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [Cron] Tracking sync job failed:', error);
    return NextResponse.json(
      {
        error: 'Tracking sync failed',
        details: error.message,
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
