import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`📋 [Get Wanted Listing] Fetching wanted listing ${id}`);

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

    // Fetch wanted listing with buyer profile
    const { data: wantedListing, error } = await (supabase as any)
      .from('wanted_listings')
      .select(`
        *,
        buyer:user_profiles!wanted_listings_buyer_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          country
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [Get Wanted Listing] Query error:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wanted listing not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch wanted listing', details: error.message },
        { status: 500 }
      );
    }

    // Fetch game images and metadata
    if (wantedListing) {
      const { data: game } = await (supabase as any)
        .from('games')
        .select('thumbnail, image, player_count, min_age, playing_time, is_expansion')
        .eq('id', wantedListing.bgg_game_id)
        .single();

      if (game) {
        wantedListing.game = {
          thumbnail: game.thumbnail,
          image: game.image,
          player_count: game.player_count,
          min_age: game.min_age,
          playing_time: game.playing_time,
          is_expansion: game.is_expansion
        };
      } else {
        wantedListing.game = {
          thumbnail: null,
          image: null,
          player_count: null,
          min_age: null,
          playing_time: null,
          is_expansion: null
        };
      }

      // Fetch responses to this wanted listing (only visible to buyer)
      const { data: { user } } = await supabase.auth.getUser();

      if (user && user.id === wantedListing.buyer_id) {
        // Buyer can see all responses
        const { data: responses } = await (supabase as any)
          .from('wanted_listing_responses')
          .select(`
            *,
            seller:user_profiles!wanted_listing_responses_seller_id_fkey (
              id,
              full_name,
              avatar_url,
              country
            )
          `)
          .eq('wanted_listing_id', id)
          .order('responded_at', { ascending: false });

        wantedListing.responses = responses || [];
      }
    }

    console.log(`✅ [Get Wanted Listing] Successfully fetched wanted listing ${id}`);

    return NextResponse.json({ wantedListing });
  } catch (error: any) {
    console.error('❌ [Get Wanted Listing] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wanted listing', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/wanted/[id]
 * Updates wanted listing status or expiration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    console.log(`📝 [Update Wanted Listing] Updating wanted listing ${id} - status: ${status}`);

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
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update wanted listing (RLS policy ensures only buyer can update)
    const { data: wantedListing, error: updateError } = await (supabase as any)
      .from('wanted_listings')
      .update({ status })
      .eq('id', id)
      .eq('buyer_id', user.id) // Ensure user owns this wanted listing
      .select()
      .single();

    if (updateError) {
      console.error('❌ [Update Wanted Listing] Update error:', updateError);

      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Wanted listing not found or you do not have permission to update it' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update wanted listing', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [Update Wanted Listing] Successfully updated wanted listing ${id}`);

    return NextResponse.json({
      wantedListing,
      message: 'Wanted listing updated successfully',
    });
  } catch (error: any) {
    console.error('❌ [Update Wanted Listing] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update wanted listing', details: error.message },
      { status: 500 }
    );
  }
}
