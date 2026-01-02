import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createServerSupabase();

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

    return NextResponse.json({ wantedListing });
  } catch (error) {
    return handleApiError(error, 'Fetch wanted listing');
  }
}

/**
 * PATCH /api/wanted/[id]
 * Updates wanted listing details (only owner can update)
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

    // Build updates object from allowed fields
    const updates: any = {};

    // Status field
    if (body.status !== undefined) {
      const validStatuses = ['active', 'expired', 'fulfilled', 'cancelled'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    // Budget fields
    if (body.min_price !== undefined) {
      const minPrice = body.min_price ? parseFloat(body.min_price) : null;
      if (minPrice !== null && minPrice < 0) {
        return NextResponse.json(
          { error: 'Minimum price cannot be negative' },
          { status: 400 }
        );
      }
      updates.min_price = minPrice;
    }
    if (body.max_price !== undefined) {
      const maxPrice = parseFloat(body.max_price);
      if (maxPrice <= 0) {
        return NextResponse.json(
          { error: 'Maximum price must be greater than 0' },
          { status: 400 }
        );
      }
      updates.max_price = maxPrice;
    }

    // Preferences
    if (body.acceptable_conditions !== undefined) {
      if (!Array.isArray(body.acceptable_conditions) || body.acceptable_conditions.length === 0) {
        return NextResponse.json(
          { error: 'At least one acceptable condition is required' },
          { status: 400 }
        );
      }
      updates.acceptable_conditions = body.acceptable_conditions;
    }
    if (body.location_preferences !== undefined) updates.location_preferences = body.location_preferences;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update wanted listing (RLS policy ensures only buyer can update)
    const { data: wantedListing, error: updateError } = await (supabase as any)
      .from('wanted_listings')
      .update(updates)
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
        { error: 'Failed to update wanted listing', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      wantedListing,
      message: 'Wanted listing updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Update wanted listing');
  }
}

/**
 * DELETE /api/wanted/[id]
 * Soft deletes a wanted listing by setting status to 'cancelled'
 * Query param: ?hard=true for hard delete (use with caution)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Hard delete - permanently remove from database
      const { error: deleteError } = await (supabase as any)
        .from('wanted_listings')
        .delete()
        .eq('id', id)
        .eq('buyer_id', user.id); // Ensure user owns this wanted listing

      if (deleteError) {
        if (deleteError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Wanted listing not found or you do not have permission to delete it' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to delete wanted listing', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Wanted listing permanently deleted',
      });
    } else {
      // Soft delete - set status to 'cancelled'
      const { data: wantedListing, error: updateError } = await (supabase as any)
        .from('wanted_listings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('buyer_id', user.id) // Ensure user owns this wanted listing
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Wanted listing not found or you do not have permission to delete it' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to delete wanted listing', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        wantedListing,
        message: 'Wanted listing cancelled successfully',
      });
    }
  } catch (error) {
    return handleApiError(error, 'Delete wanted listing');
  }
}
