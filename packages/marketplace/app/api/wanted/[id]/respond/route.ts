import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import type { TypedSupabase } from '@/lib/supabase/query-types';

/**
 * POST /api/wanted/[id]/respond
 * Seller responds to a wanted listing with "I have this"
 * Creates a response record and initiates a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: wantedListingId } = params;
    const body = await request.json();
    const {
      offered_price,
      offered_condition,
      response_notes,
      photo_urls, // Optional photos from seller
    } = body;

    // Validation
    if (!offered_price || parseFloat(offered_price) <= 0) {
      return NextResponse.json(
        { error: 'Offered price is required' },
        { status: 400 }
      );
    }

    if (!offered_condition) {
      return NextResponse.json(
        { error: 'Offered condition is required' },
        { status: 400 }
      );
    }

    const validConditions = ['likeNew', 'veryGood', 'good', 'acceptable'];
    if (!validConditions.includes(offered_condition)) {
      return NextResponse.json(
        { error: 'Invalid condition value' },
        { status: 400 }
      );
    }

    const { response: authResponse, user, supabase } = await requireAuth();
    if (authResponse) return authResponse;

    const sellerId = user.id;

    // Fetch wanted listing
    const { data: wantedListing, error: fetchError } = await (supabase as TypedSupabase)
      .from('wanted_listings')
      .select('*')
      .eq('id', wantedListingId)
      .single();

    if (fetchError || !wantedListing) {
      return NextResponse.json(
        { error: 'Wanted listing not found' },
        { status: 404 }
      );
    }

    // Validate listing is active
    if (wantedListing.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot respond to a ${wantedListing.status} wanted listing` },
        { status: 400 }
      );
    }

    // Prevent buyer from responding to their own wanted listing
    if (wantedListing.buyer_id === sellerId) {
      return NextResponse.json(
        { error: 'Cannot respond to your own wanted listing' },
        { status: 400 }
      );
    }

    // Check if at max responses (10)
    if (wantedListing.response_count >= 10) {
      return NextResponse.json(
        { error: 'This wanted listing has reached the maximum number of responses (10)' },
        { status: 400 }
      );
    }

    // Validate offered condition is acceptable
    if (!wantedListing.acceptable_conditions.includes(offered_condition)) {
      return NextResponse.json(
        { error: `Offered condition '${offered_condition}' is not acceptable for this wanted listing. Acceptable conditions: ${wantedListing.acceptable_conditions.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if seller already responded
    const { data: existingResponse } = await (supabase as TypedSupabase)
      .from('wanted_listing_responses')
      .select('id')
      .eq('wanted_listing_id', wantedListingId)
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already responded to this wanted listing' },
        { status: 400 }
      );
    }

    // Check if users have blocked each other
    const { data: blockCheck } = await (supabase as TypedSupabase)
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${sellerId},blocked_id.eq.${wantedListing.buyer_id}),and(blocker_id.eq.${wantedListing.buyer_id},blocked_id.eq.${sellerId})`)
      .limit(1)
      .maybeSingle();

    if (blockCheck) {
      return NextResponse.json(
        { error: 'Cannot respond to this wanted listing' },
        { status: 403 }
      );
    }

    // Check if conversation already exists between these two users
    // Note: For wanted listings, the SELLER is the "buyer" in the conversation (initiator)
    // and the ISO poster is the "seller" (recipient)
    // We check by buyer/seller IDs only since listing_id is null for wanted listings
    const { data: existingConversation } = await (supabase as TypedSupabase)
      .from('conversations')
      .select('id')
      .is('listing_id', null) // Only wanted listing conversations
      .eq('buyer_id', sellerId) // Seller initiates
      .eq('seller_id', wantedListing.buyer_id) // ISO poster receives
      .maybeSingle();

    let conversationId: string;

    if (existingConversation) {
      // Use existing conversation
      conversationId = existingConversation.id;

      // Unarchive if it was archived
      await (supabase as TypedSupabase)
        .from('conversations')
        .update({
          buyer_archived_at: null, // Seller's archive status
          seller_archived_at: null, // Buyer's archive status
        })
        .eq('id', conversationId);
    } else {
      // Rate limit conversation creation
      const rateLimitResult = await checkRateLimit('conversationCreate', sellerId);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: rateLimitResult.error,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          },
          { status: 429 }
        );
      }

      // Create new conversation
      // For wanted listings: seller = buyer (initiator), ISO poster = seller (recipient)
      // listing_id is null for wanted listings (tracked via wanted_listing_responses instead)
      const { data: newConversation, error: createError } = await (supabase as TypedSupabase)
        .from('conversations')
        .insert({
          listing_id: null, // NULL for wanted listings
          buyer_id: sellerId, // Seller initiates
          seller_id: wantedListing.buyer_id, // ISO poster receives
        })
        .select('id')
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create conversation', details: createError.message },
          { status: 500 }
        );
      }

      conversationId = newConversation.id;
    }

    // Determine if this is a quick response (within 2 hours)
    const createdAt = new Date(wantedListing.created_at || Date.now());
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const isQuickResponse = hoursDiff <= 2;

    // Create response record
    const { data: response, error: responseError } = await (supabase as TypedSupabase)
      .from('wanted_listing_responses')
      .insert({
        wanted_listing_id: wantedListingId,
        seller_id: sellerId,
        conversation_id: conversationId,
        offered_price: parseFloat(offered_price),
        offered_condition,
        response_notes: response_notes || null,
        is_quick_response: isQuickResponse,
      })
      .select()
      .single();

    if (responseError) {
      return NextResponse.json(
        { error: 'Failed to create response', details: responseError.message },
        { status: 500 }
      );
    }

    // Create initial message with offer details
    const conditionLabels: Record<string, string> = {
      likeNew: 'Like New',
      veryGood: 'Very Good',
      good: 'Good',
      acceptable: 'Acceptable',
    };

    let messageContent = `Hi! I have ${wantedListing.game_name} available.\n\n`;
    messageContent += `**My Offer:**\n`;
    messageContent += `• Condition: ${conditionLabels[offered_condition]}\n`;
    messageContent += `• Price: €${offered_price}\n`;

    if (photo_urls && photo_urls.length > 0) {
      messageContent += `• Photos: ${photo_urls.length} photo(s) attached\n`;
    }

    if (response_notes) {
      messageContent += `\n${response_notes}\n`;
    }

    messageContent += `\nLet me know if you're interested!`;

    // Send initial message
    const { error: messageError } = await (supabase as TypedSupabase)
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: sellerId,
        content: messageContent,
      });

    if (messageError) {
      // Don't fail the whole request if message fails
    }

    return NextResponse.json({
      response,
      conversation_id: conversationId,
      is_quick_response: isQuickResponse,
      message: 'Response created successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Respond to wanted listing');
  }
}
