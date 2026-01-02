import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * PATCH /api/wanted/[id]/status
 * Quick status change endpoint for wanted listing management
 * This endpoint only updates status (useful for quick actions like "Mark as Fulfilled")
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['active', 'expired', 'fulfilled', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update wanted listing status (RLS policy ensures only buyer can update)
    const { data: wantedListing, error: updateError } = await (supabase as any)
      .from('wanted_listings')
      .update({ status })
      .eq('id', id)
      .eq('buyer_id', user.id) // Ensure user owns this wanted listing
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wanted listing not found or you do not have permission to update it' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update wanted listing status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      wantedListing,
      message: `Wanted listing ${status === 'fulfilled' ? 'marked as fulfilled' : status === 'cancelled' ? 'cancelled' : status === 'active' ? 'reactivated' : 'updated'} successfully`,
    });
  } catch (error) {
    return handleApiError(error, 'Update wanted listing status');
  }
}
