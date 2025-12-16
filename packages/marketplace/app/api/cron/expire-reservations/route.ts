import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/expire-reservations
 *
 * Cron job to release expired cart reservations
 * Should run every minute via Vercel Cron
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-reservations",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require cron secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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

    console.log('🕐 [Cron] Running expire-reservations job...');

    // Call the cleanup function
    const { data: cleanedCount, error } = await supabase.rpc(
      'cleanup_expired_cart_items'
    );

    if (error) {
      console.error('❌ [Cron] Error cleaning up reservations:', error);
      return NextResponse.json(
        { error: 'Failed to clean up reservations', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [Cron] Cleaned up ${cleanedCount || 0} expired reservations`);

    return NextResponse.json({
      success: true,
      cleanedCount: cleanedCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export const POST = GET;
