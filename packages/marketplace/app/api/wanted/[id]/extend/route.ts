import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import type { TypedSupabase } from '@/lib/supabase/query-types';

/**
 * POST /api/wanted/[id]/extend
 * Extends the expiration date of a wanted listing by 30 days
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id } = params;

    // Fetch current wanted listing to verify ownership and get current expiration
    const { data: currentListing, error: fetchError } = await (supabase as TypedSupabase)
      .from('wanted_listings')
      .select('buyer_id, status, expires_at')
      .eq('id', id)
      .single();

    if (fetchError || !currentListing) {
      return NextResponse.json(
        { error: 'Wanted listing not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (currentListing.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to extend this wanted listing' },
        { status: 403 }
      );
    }

    // Only allow extending active or expired listings
    if (!['active', 'expired'].includes(currentListing.status)) {
      return NextResponse.json(
        { error: `Cannot extend a ${currentListing.status} wanted listing` },
        { status: 400 }
      );
    }

    // Calculate new expiration date (current expiration + 30 days, or NOW + 30 days if already expired)
    const currentExpiration = new Date(currentListing.expires_at || new Date());
    const now = new Date();
    const baseDate = currentExpiration > now ? currentExpiration : now;
    const newExpiration = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update wanted listing
    const { data: wantedListing, error: updateError } = await (supabase as TypedSupabase)
      .from('wanted_listings')
      .update({
        expires_at: newExpiration.toISOString(),
        status: 'active', // Reactivate if expired
      })
      .eq('id', id)
      .eq('buyer_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to extend wanted listing', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      wantedListing,
      message: 'Wanted listing extended by 30 days',
      newExpiresAt: wantedListing.expires_at,
    });
  } catch (error) {
    return handleApiError(error, 'Extend wanted listing');
  }
}
