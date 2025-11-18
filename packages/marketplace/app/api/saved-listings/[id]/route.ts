import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    console.log(`🗑️ [Delete Saved Listing] Deleting saved listing ${id}`);

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

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
      console.error('❌ [Delete Saved Listing] Delete error:', deleteError);

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

    console.log(`✅ [Delete Saved Listing] Successfully deleted saved listing ${id}`);

    return NextResponse.json({
      message: 'Saved listing deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ [Delete Saved Listing] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved listing', details: error.message },
      { status: 500 }
    );
  }
}
