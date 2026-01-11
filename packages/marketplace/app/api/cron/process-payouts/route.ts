import { NextRequest, NextResponse } from 'next/server';
import { processAllPendingPayouts } from '@/lib/stripe/payout-service';

/**
 * GET /api/cron/process-payouts
 *
 * Cron job to process pending seller payouts for completed orders
 * Runs daily to transfer funds to sellers
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
      console.error('[Cron] Unauthorized payout processing attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('💸 [Cron] Starting payout processing job...');

    // Process all pending payouts
    const result = await processAllPendingPayouts();

    console.log(`💸 [Cron] Processed ${result.totalProcessed} orders`);
    console.log(`✅ [Cron] Success: ${result.successCount}, Errors: ${result.errorCount}`);

    return NextResponse.json({
      success: true,
      totalProcessed: result.totalProcessed,
      successCount: result.successCount,
      errorCount: result.errorCount,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [Cron] Payout processing job failed:', error);
    return NextResponse.json(
      {
        error: 'Payout processing failed',
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
