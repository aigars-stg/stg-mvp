import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import type { InitiateConversationRequest, InitiateConversationResponse } from '@/lib/types/message';

/**
 * POST /api/messages/initiate
 * Create or retrieve a conversation for a buyer-seller-listing combination
 */
export async function POST(request: NextRequest) {
  try {
    const body: InitiateConversationRequest = await request.json();
    const { listing_id, seller_id, initial_message } = body;

    // Validate required fields
    if (!listing_id || !seller_id) {
      return NextResponse.json(
        { error: 'listing_id and seller_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Prevent user from messaging themselves
    if (user.id === seller_id) {
      return NextResponse.json(
        { error: 'Cannot message yourself' },
        { status: 400 }
      );
    }

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, seller_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Listing is not active' },
        { status: 400 }
      );
    }

    // Verify seller_id matches listing
    if (listing.seller_id !== seller_id) {
      return NextResponse.json(
        { error: 'Invalid seller_id for this listing' },
        { status: 400 }
      );
    }

    // Check if users have blocked each other
    const { data: blockCheck } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${seller_id}),and(blocker_id.eq.${seller_id},blocked_id.eq.${user.id})`)
      .limit(1)
      .maybeSingle();

    if (blockCheck) {
      return NextResponse.json(
        { error: 'Cannot start conversation with this user' },
        { status: 403 }
      );
    }

    // Check if conversation already exists
    const { data: existingConversation, error: conversationCheckError } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('buyer_id', user.id)
      .eq('seller_id', seller_id)
      .maybeSingle();

    if (conversationCheckError) {
      return NextResponse.json(
        { error: 'Failed to check for existing conversation' },
        { status: 500 }
      );
    }

    // If conversation exists, return it
    if (existingConversation) {
      // Unarchive if it was archived by the buyer
      await supabase
        .from('conversations')
        .update({ buyer_archived_at: null })
        .eq('id', existingConversation.id)
        .eq('buyer_id', user.id);

      const response: InitiateConversationResponse = {
        conversation_id: existingConversation.id,
        is_new: false,
      };

      return NextResponse.json(response, { status: 200 });
    }

    // Rate limit new conversation creation
    const rateLimitResult = await checkRateLimit('conversationCreate', user.id);
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
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        listing_id,
        buyer_id: user.id,
        seller_id,
      })
      .select('id')
      .single();

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Send initial message if provided
    if (initial_message && initial_message.trim()) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: user.id,
          content: initial_message.trim(),
        });

      if (messageError) {
        // Don't fail the whole request if initial message fails
        // The conversation was created successfully
      }
    }

    const response: InitiateConversationResponse = {
      conversation_id: newConversation.id,
      is_new: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
