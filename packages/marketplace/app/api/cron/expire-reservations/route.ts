import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/api/error-handler';

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

    console.log('🕐 [Cron] Running expire-reservations job...');

    // Call the cleanup function
    const { data: cleanedCount, error } = await supabase.rpc(
      'cleanup_expired_cart_items'
    );

    if (error) {
      throw new Error(`Failed to clean up reservations: ${error.message}`);
    }

    console.log(`✅ [Cron] Cleaned up ${cleanedCount || 0} expired reservations`);

    return NextResponse.json({
      success: true,
      cleanedCount: cleanedCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Expire reservations');
  }
}

// Also support POST for manual triggers
export const POST = GET;
