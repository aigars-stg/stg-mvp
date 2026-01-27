import { NextRequest, NextResponse } from 'next/server';
import { processAutoPayouts } from '@/lib/stripe/payout-service';

/**
 * GET /api/cron/auto-payouts
 *
 * Weekly cron job (Mondays 9:00 UTC) to process auto-payouts
 * for sellers whose balance exceeds their threshold.
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

    console.log('💸 [Cron] Starting auto-payout job...');

    const result = await processAutoPayouts();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ [Cron] Auto-payout job failed:', error);
    return NextResponse.json(
      {
        error: 'Auto-payout processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
