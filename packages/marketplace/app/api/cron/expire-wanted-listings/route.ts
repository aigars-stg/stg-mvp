import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * Cron job to expire wanted listings
 * Runs daily at midnight UTC via Vercel cron
 * Calls the expire_wanted_listings() database function
 */
export async function GET(request: Request) {
  // Verify cron secret from Vercel for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error('CRON_SECRET environment variable not set');
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('[Cron] Running expire_wanted_listings()...');

    // Call database function to expire listings
    const { data, error } = await supabase.rpc('expire_wanted_listings');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const expiredCount = data || 0;
    console.log(`[Cron] Successfully expired ${expiredCount} wanted listings`);

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
      message: `Expired ${expiredCount} wanted listing(s)`,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Expire wanted listings');
  }
}
