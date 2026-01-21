import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * DELETE /api/saved-listings/[id]
 * Deletes a saved listing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id } = params;

    // Delete saved listing (RLS policy ensures only owner can delete)
    const { error: deleteError } = await supabase
      .from('saved_listings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Saved listing not found or you do not have permission to delete it' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to delete saved listing', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Saved listing deleted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Delete saved listing');
  }
}
