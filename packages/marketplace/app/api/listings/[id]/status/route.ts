import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

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
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id } = params;
    const body = await request.json();
    const { status } = body;

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
  } catch (error) {
    return handleApiError(error, 'Update listing status');
  }
}
