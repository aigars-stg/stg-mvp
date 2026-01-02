import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * PATCH /api/listings/[id]/status
 * Quick status change endpoint for listing management
 * This endpoint only updates status (useful for quick actions like "Mark as Sold")
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;
    const supabase = await createServerSupabase();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to update a listing' },
        { status: 401 }
      );
    }

    // Validate status
    const validStatuses = ['draft', 'active', 'sold', 'removed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update listing status (RLS policy ensures only seller can update)
    const { data: listing, error: updateError } = await (supabase as any)
      .from('listings')
      .update({ status })
      .eq('id', id)
      .eq('seller_id', user.id) // Ensure user owns this listing
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Listing not found or you do not have permission to update it' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update listing status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      listing,
      message: `Listing ${status === 'sold' ? 'marked as sold' : status === 'removed' ? 'removed' : status === 'active' ? 'reactivated' : 'updated'} successfully`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update listing status', details: message },
      { status: 500 }
    );
  }
}
