import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPayoutSettings, updatePayoutSettings } from '@/lib/stripe/payout-service';

/**
 * GET /api/seller/payout-settings
 * Get the current user's payout settings
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getPayoutSettings(user.id);
    if (!settings) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.error('❌ [Payout Settings] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/seller/payout-settings
 * Update the current user's payout settings
 *
 * Body: { payoutThreshold?: number, payoutType?: 'auto' | 'manual' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Accept both camelCase and snake_case
    const payoutThreshold = body.payoutThreshold ?? body.payout_threshold;
    const payoutType = body.payoutType ?? body.payout_type;

    const result = await updatePayoutSettings(user.id, {
      payoutThreshold,
      payoutType,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('❌ [Payout Settings] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
