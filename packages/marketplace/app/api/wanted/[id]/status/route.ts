import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    console.log(`📝 [Update Wanted Listing Status] Updating wanted listing ${id} - status: ${status}`);

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
        { error: 'You must be signed in to update a wanted listing' },
        { status: 401 }
      );
    }

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
      console.error('❌ [Update Wanted Listing Status] Update error:', updateError);

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

    console.log(`✅ [Update Wanted Listing Status] Successfully updated wanted listing ${id} to ${status}`);

    return NextResponse.json({
      wantedListing,
      message: `Wanted listing ${status === 'fulfilled' ? 'marked as fulfilled' : status === 'cancelled' ? 'cancelled' : status === 'active' ? 'reactivated' : 'updated'} successfully`,
    });
  } catch (error: any) {
    console.error('❌ [Update Wanted Listing Status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update wanted listing status', details: error.message },
      { status: 500 }
    );
  }
}
