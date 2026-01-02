import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * DELETE /api/saved-listings/[id]
 * Deletes a saved listing
 */
export async function DELETE(
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
        { error: 'You must be signed in to delete a saved listing' },
        { status: 401 }
      );
    }

    // Delete saved listing (RLS policy ensures only owner can delete)
    const { error: deleteError } = await (supabase as any)
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete saved listing', details: message },
      { status: 500 }
    );
  }
}
