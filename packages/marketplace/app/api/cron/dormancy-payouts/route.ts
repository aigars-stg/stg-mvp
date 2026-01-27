import { NextRequest, NextResponse } from 'next/server';
import { processDormancyPayouts } from '@/lib/stripe/payout-service';

/**
 * GET /api/cron/dormancy-payouts
 *
 * Monthly cron job to handle dormant seller balances.
 * Phase 1: Warn sellers at 5 months of inactivity.
 * Phase 2: Auto-payout sellers at 6+ months (if warned 1+ month ago).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('💤 [Cron] Starting dormancy check job...');

    const result = await processDormancyPayouts();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ [Cron] Dormancy check job failed:', error);
    return NextResponse.json(
      {
        error: 'Dormancy check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
