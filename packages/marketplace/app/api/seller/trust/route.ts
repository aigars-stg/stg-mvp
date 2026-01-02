import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/seller/trust
 *
 * Get the authenticated seller's trust/reputation data
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
      return NextResponse.json(
        { error: 'You must be signed in to view trust data' },
        { status: 401 }
      );
    }

    // Fetch trust summary using the database function
    const { data: trustSummary, error: trustError } = await supabase
      .rpc('get_seller_trust_summary', { p_seller_id: user.id });

    if (trustError) {

      // If the function fails, try fetching directly from seller_profiles
      const { data: profile, error: profileError } = await supabase
        .from('seller_profiles')
        .select('total_reviews, average_rating, positive_rating_percent, total_completed_sales, member_since')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        // No seller profile - return defaults
        return NextResponse.json({
          total_reviews: 0,
          average_rating: 0,
          positive_rating_percent: 100,
          total_completed_sales: 0,
          member_since: null,
          badge_tier: 'new_seller',
        });
      }

      // Calculate badge tier
      const badgeTier = getBadgeTier(
        profile.total_completed_sales || 0,
        profile.average_rating || 0
      );

      return NextResponse.json({
        ...profile,
        badge_tier: badgeTier,
      });
    }

    return NextResponse.json(trustSummary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch trust data', details: message },
      { status: 500 }
    );
  }
}

function getBadgeTier(totalSales: number, averageRating: number): string {
  if (totalSales >= 25 && averageRating >= 4.8) {
    return 'top_seller';
  }
  if (totalSales >= 5 && averageRating >= 4.5) {
    return 'trusted_seller';
  }
  return 'new_seller';
}
