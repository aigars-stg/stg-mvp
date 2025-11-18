import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/listings/[id]/save
 * Toggles save status for a listing (save if not saved, unsave if already saved)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🔄 [Toggle Save] Toggling save status for listing ${id}`);

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
        { error: 'You must be signed in to save a listing' },
        { status: 401 }
      );
    }

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
        console.error('❌ [Toggle Save] Delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to unsave listing', details: deleteError.message },
          { status: 500 }
        );
      }

      console.log(`✅ [Toggle Save] Unsaved listing ${id}`);

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
        console.error('❌ [Toggle Save] Save error:', saveError);
        return NextResponse.json(
          { error: 'Failed to save listing', details: saveError.message },
          { status: 500 }
        );
      }

      console.log(`✅ [Toggle Save] Saved listing ${id}`);

      return NextResponse.json({
        saved: true,
        savedListing,
        message: 'Listing saved successfully',
      });
    }
  } catch (error: any) {
    console.error('❌ [Toggle Save] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle save status', details: error.message },
      { status: 500 }
    );
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
  } catch (error: any) {
    console.error('❌ [Check Save] Unexpected error:', error);
    return NextResponse.json({ saved: false });
  }
}
