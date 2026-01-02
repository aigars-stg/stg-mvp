import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/listings/[id]/save
 * Toggles save status for a listing (save if not saved, unsave if already saved)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id } = params;

    // Check if listing exists and is active
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('id, status')
      .eq('id', id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const { data: existingSave } = await (supabase as any)
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .maybeSingle();

    if (existingSave) {
      // Already saved - unsave it
      const { error: deleteError } = await (supabase as any)
        .from('saved_listings')
        .delete()
        .eq('id', existingSave.id)
        .eq('user_id', user.id);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to unsave listing', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        saved: false,
        message: 'Listing unsaved successfully',
      });
    } else {
      // Not saved - save it
      const { data: savedListing, error: saveError } = await (supabase as any)
        .from('saved_listings')
        .insert({
          user_id: user.id,
          listing_id: id,
        })
        .select()
        .single();

      if (saveError) {
        return NextResponse.json(
          { error: 'Failed to save listing', details: saveError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        saved: true,
        savedListing,
        message: 'Listing saved successfully',
      });
    }
  } catch (error) {
    return handleApiError(error, 'Toggle save status');
  }
}

/**
 * GET /api/listings/[id]/save
 * Checks if a listing is saved by the current user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createServerSupabase();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ saved: false });
    }

    // Check if saved
    const { data: existingSave } = await (supabase as any)
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .maybeSingle();

    return NextResponse.json({
      saved: !!existingSave,
    });
  } catch (error: unknown) {
    return NextResponse.json({ saved: false });
  }
}
