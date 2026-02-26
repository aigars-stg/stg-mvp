import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

interface GameVersion {
  id: number;
  thumbnail?: string | null;
  image?: string | null;
}

interface GameMetadata {
  thumbnail: string | null;
  image: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean | null;
}

// Extended listing update type that includes fields that may not be in the generated types yet
interface ListingUpdateFields {
  condition?: string | null;
  condition_notes?: string | null;
  all_components_present?: boolean | null;
  missing_components?: string | null;
  price?: number;
  previous_price?: number | null;
  accept_offers?: boolean;
  minimum_offer?: number | null;
  photo_urls?: string[];
  shipping_local_pickup?: boolean;
  shipping_parcel_locker?: boolean;
  shipping_notes?: string | null;
  pickup_city?: string | null;
  status?: string;
  why_selling?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const supabase = await createServerSupabase();

    // Fetch listing with seller profile
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:user_profiles!seller_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch listing', details: error.message },
        { status: 500 }
      );
    }

    // Build response with game metadata
    let gameMetadata: GameMetadata = {
      thumbnail: null,
      image: null,
      player_count: null,
      min_age: null,
      playing_time: null,
      is_expansion: null
    };

    // Fetch game images and metadata (including versions for version-specific images)
    if (listing) {
      const { data: game } = await supabase
        .from('games')
        .select('thumbnail, image, player_count, min_age, playing_time, versions, is_expansion')
        .eq('id', listing.bgg_game_id)
        .single();

      if (game) {
        // Fetch version-specific images if bgg_version_id exists
        let versionThumbnail: string | null = null;
        let versionImage: string | null = null;

        if (listing.bgg_version_id && game.versions) {
          const versions = game.versions as unknown as GameVersion[];
          const version = versions.find((v) => v.id === listing.bgg_version_id);
          if (version) {
            versionThumbnail = version.thumbnail ?? null;
            versionImage = version.image ?? null;
          }
        }

        // Priority: 1) Version image, 2) Base game image
        gameMetadata = {
          thumbnail: versionThumbnail || game.thumbnail,
          image: versionImage || game.image,
          player_count: game.player_count,
          min_age: game.min_age,
          playing_time: game.playing_time,
          is_expansion: game.is_expansion
        };
      }
    }

    return NextResponse.json({ listing: { ...listing, game: gameMetadata } });
  } catch (error) {
    return handleApiError(error, 'Fetch listing');
  }
}

/**
 * PATCH /api/listings/[id]
 * Updates listing details (only owner can update)
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
    const updates: ListingUpdateFields = {};

    // Condition fields
    if (body.condition !== undefined) {
      const validConditions = ['likeNew', 'veryGood', 'good', 'acceptable'];
      if (!validConditions.includes(body.condition)) {
        return NextResponse.json(
          { error: `Invalid condition. Must be one of: ${validConditions.join(', ')}` },
          { status: 400 }
        );
      }
      updates.condition = body.condition;
    }
    if (body.condition_notes !== undefined) updates.condition_notes = body.condition_notes;
    if (body.all_components_present !== undefined) updates.all_components_present = body.all_components_present;
    if (body.missing_components !== undefined) updates.missing_components = body.missing_components;

    // Pricing fields - handle price reduction tracking
    if (body.price !== undefined) {
      const price = parseFloat(body.price);
      if (price <= 0) {
        return NextResponse.json(
          { error: 'Price must be greater than 0' },
          { status: 400 }
        );
      }

      // Fetch current listing to check for price reduction
      const { data: currentListing } = await supabase
        .from('listings')
        .select('price, previous_price')
        .eq('id', id)
        .eq('seller_id', user!.id)
        .single();

      if (currentListing) {
        // If new price is lower than current price, save current price as previous_price
        if (price < currentListing.price) {
          updates.previous_price = currentListing.price;
        }
        // If price is being increased, clear previous_price (no longer a "reduced" price)
        else if (price > currentListing.price && currentListing.previous_price !== null) {
          updates.previous_price = null;
        }
        // If price stays the same, don't change previous_price
      }

      updates.price = price;
    }
    if (body.accept_offers !== undefined) updates.accept_offers = body.accept_offers;
    if (body.minimum_offer !== undefined) {
      const minOffer = body.minimum_offer ? parseFloat(body.minimum_offer) : null;
      if (minOffer !== null && minOffer <= 0) {
        return NextResponse.json(
          { error: 'Minimum offer must be greater than 0' },
          { status: 400 }
        );
      }
      updates.minimum_offer = minOffer;
    }

    // Photo fields
    if (body.photo_urls !== undefined) {
      if (!Array.isArray(body.photo_urls)) {
        return NextResponse.json(
          { error: 'photo_urls must be an array' },
          { status: 400 }
        );
      }
      updates.photo_urls = body.photo_urls;
    }

    // Shipping fields
    if (body.shipping_local_pickup !== undefined) updates.shipping_local_pickup = body.shipping_local_pickup;
    if (body.shipping_parcel_locker !== undefined) updates.shipping_parcel_locker = body.shipping_parcel_locker;
    if (body.shipping_notes !== undefined) updates.shipping_notes = body.shipping_notes;
    if (body.pickup_city !== undefined) updates.pickup_city = body.pickup_city;

    // Status field (for status changes)
    if (body.status !== undefined) {
      const validStatuses = ['draft', 'active', 'sold', 'removed'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    // Additional fields
    if (body.why_selling !== undefined) updates.why_selling = body.why_selling;

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update listing (RLS policy ensures only seller can update)
    // Cast to Record for flexibility with fields that may not be in generated types
    const { data: listing, error: updateError } = await supabase
      .from('listings')
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .eq('seller_id', user!.id) // Ensure user owns this listing
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
        { error: 'Failed to update listing', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      listing,
      message: 'Listing updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Update listing');
  }
}

/**
 * DELETE /api/listings/[id]
 * Soft deletes a listing by setting status to 'removed'
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
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('seller_id', user!.id); // Ensure user owns this listing

      if (deleteError) {
        if (deleteError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Listing not found or you do not have permission to delete it' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to delete listing', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Listing permanently deleted',
      });
    } else {
      // Soft delete - set status to 'removed'
      const { data: listing, error: updateError } = await supabase
        .from('listings')
        .update({ status: 'removed' })
        .eq('id', id)
        .eq('seller_id', user!.id) // Ensure user owns this listing
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Listing not found or you do not have permission to delete it' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to delete listing', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        listing,
        message: 'Listing removed successfully',
      });
    }
  } catch (error) {
    return handleApiError(error, 'Delete listing');
  }
}
