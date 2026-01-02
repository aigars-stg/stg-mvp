import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/wanted/[id]/extend
 * Extends the expiration date of a wanted listing by 30 days
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createServerSupabase();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to extend a wanted listing' },
        { status: 401 }
      );
    }

    // Fetch current wanted listing to verify ownership and get current expiration
    const { data: currentListing, error: fetchError } = await (supabase as any)
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
    const currentExpiration = new Date(currentListing.expires_at);
    const now = new Date();
    const baseDate = currentExpiration > now ? currentExpiration : now;
    const newExpiration = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update wanted listing
    const { data: wantedListing, error: updateError } = await (supabase as any)
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to extend wanted listing', details: message },
      { status: 500 }
    );
  }
}
