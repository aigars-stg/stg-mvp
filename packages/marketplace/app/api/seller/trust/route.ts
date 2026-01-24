import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/trust
 *
 * Get the authenticated seller's trust/reputation data
 */
export async function GET(_request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

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
  } catch (error) {
    return handleApiError(error, 'Fetch trust data');
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
