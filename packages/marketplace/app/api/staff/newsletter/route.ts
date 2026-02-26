import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import { handleApiError, handleForbiddenError, handleAuthError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/newsletter
 *
 * Staff-only endpoint to list newsletter subscribers with stats.
 * Supports ?format=csv for export.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return handleAuthError('Staff newsletter list');
    }

    // Verify staff status
    const serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_staff) {
      return handleForbiddenError('Staff newsletter list');
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Fetch all subscribers
    const { data: subscribers, error: fetchError } = await serviceClient
      .from('newsletter_subscribers')
      .select('id, email, source, locale, subscribed_at, unsubscribed_at, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      return handleApiError(fetchError, 'Fetch newsletter subscribers');
    }

    const all = subscribers || [];
    const active = all.filter((s) => !s.unsubscribed_at);
    const unsubscribed = all.filter((s) => s.unsubscribed_at);

    // CSV export (active subscribers only)
    if (format === 'csv') {
      const header = 'email,source,locale,subscribed_at';
      const rows = active.map(
        (s) => `${s.email},${s.source},${s.locale},${s.subscribed_at}`
      );
      const csv = [header, ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Stats breakdown
    const sourceBreakdown: Record<string, number> = {};
    const localeBreakdown: Record<string, number> = {};
    for (const s of active) {
      const src = s.source || 'unknown';
      const loc = s.locale || 'unknown';
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
      localeBreakdown[loc] = (localeBreakdown[loc] || 0) + 1;
    }

    return NextResponse.json({
      subscribers: all,
      stats: {
        total: all.length,
        active: active.length,
        unsubscribed: unsubscribed.length,
        bySource: sourceBreakdown,
        byLocale: localeBreakdown,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Staff newsletter');
  }
}
