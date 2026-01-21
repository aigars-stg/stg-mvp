import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import type { Message, SendMessageRequest, Conversation } from '@/lib/types/message';
import { MESSAGE_CONSTRAINTS } from '@/lib/types/message';
import { sendNewMessageEmailAsync } from '@/lib/email/send-message-emails';

/**
 * GET /api/messages/[id]
 * Get all messages in a conversation and conversation details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const supabase = await createServerSupabase();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get conversation and verify user is a participant
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        id,
        listing_id,
        buyer_id,
        seller_id,
        last_message_at,
        buyer_archived_at,
        seller_archived_at,
        created_at,
        updated_at
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this conversation' },
        { status: 403 }
      );
    }

    // Get listing details (only if conversation has a listing)
    let listing: {
      id: string;
      game_name: string;
      price: number;
      status: string;
      photo_urls: string[];
      bgg_game_id: number;
    } | null = null;
    if (conversation.listing_id) {
      const { data } = await supabase
        .from('listings')
        .select('id, game_name, price, status, photo_urls, bgg_game_id')
        .eq('id', conversation.listing_id)
        .single();
      listing = data;
    }

    // Get other user's profile
    const otherUserId = conversation.buyer_id === user.id
      ? conversation.seller_id
      : conversation.buyer_id;

    const { data: otherProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', otherUserId)
      .single();

    // Get current user's profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Attach sender profiles to messages, coercing nullable DB fields
    const messagesWithProfiles: Message[] = (messages || []).map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      is_system_message: msg.is_system_message ?? false,
      system_message_type: msg.system_message_type as Message['system_message_type'],
      photo_urls: msg.photo_urls ?? [],
      created_at: msg.created_at ?? new Date().toISOString(),
      updated_at: msg.updated_at ?? new Date().toISOString(),
      deleted_at: msg.deleted_at,
      sender: msg.sender_id === user.id
        ? {
            id: userProfile?.id || user.id,
            full_name: userProfile?.full_name || null,
            avatar_url: userProfile?.avatar_url || null,
          }
        : {
            id: otherProfile?.id || otherUserId,
            full_name: otherProfile?.full_name || null,
            avatar_url: otherProfile?.avatar_url || null,
          },
    }));

    // Build full conversation response, coercing nullable DB fields
    const conversationData: Conversation = {
      id: conversation.id,
      listing_id: conversation.listing_id,
      buyer_id: conversation.buyer_id,
      seller_id: conversation.seller_id,
      last_message_at: conversation.last_message_at ?? new Date().toISOString(),
      buyer_archived_at: conversation.buyer_archived_at,
      seller_archived_at: conversation.seller_archived_at,
      created_at: conversation.created_at ?? new Date().toISOString(),
      updated_at: conversation.updated_at ?? new Date().toISOString(),
      listing: listing ? {
        id: listing.id,
        title: listing.game_name,
        price: listing.price,
        status: listing.status,
        photos: listing.photo_urls || [],
        game_id: listing.bgg_game_id,
        game_name: listing.game_name,
      } : undefined,
      buyer_profile: conversation.buyer_id === user.id
        ? {
            id: userProfile?.id || user.id,
            full_name: userProfile?.full_name || null,
            avatar_url: userProfile?.avatar_url || null,
          }
        : {
            id: otherProfile?.id || otherUserId,
            full_name: otherProfile?.full_name || null,
            avatar_url: otherProfile?.avatar_url || null,
          },
      seller_profile: conversation.seller_id === user.id
        ? {
            id: userProfile?.id || user.id,
            full_name: userProfile?.full_name || null,
            avatar_url: userProfile?.avatar_url || null,
          }
        : {
            id: otherProfile?.id || otherUserId,
            full_name: otherProfile?.full_name || null,
            avatar_url: otherProfile?.avatar_url || null,
          },
    };

    return NextResponse.json(
      {
        conversation: conversationData,
        messages: messagesWithProfiles,
      },
      { status: 200 }
    );
  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/[id]
 * Send a new message in a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body: SendMessageRequest = await request.json();
    const { content, photo_urls } = body;

    // Validate that at least content or photos are provided
    const hasContent = content && content.trim().length > 0;
    const hasPhotos = photo_urls && photo_urls.length > 0;

    if (!hasContent && !hasPhotos) {
      return NextResponse.json(
        { error: 'Message content or photos required' },
        { status: 400 }
      );
    }

    if (hasContent && content.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      return NextResponse.json(
        { error: `Message cannot exceed ${MESSAGE_CONSTRAINTS.MAX_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate photo_urls count
    if (hasPhotos && photo_urls.length > MESSAGE_CONSTRAINTS.MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Cannot attach more than ${MESSAGE_CONSTRAINTS.MAX_PHOTOS} photos` },
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

    // Check rate limit
    const rateLimitResult = await checkRateLimit('messageCreate', user.id);
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

    // Verify conversation exists and user is a participant
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, buyer_id, seller_id, order_id, buyer_archived_at, seller_archived_at')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to send messages in this conversation' },
        { status: 403 }
      );
    }

    // Unarchive conversation if archived
    if (conversation.buyer_id === user.id && conversation.buyer_archived_at) {
      await supabase
        .from('conversations')
        .update({ buyer_archived_at: null })
        .eq('id', conversationId);
    } else if (conversation.seller_id === user.id && conversation.seller_archived_at) {
      await supabase
        .from('conversations')
        .update({ seller_archived_at: null })
        .eq('id', conversationId);
    }

    // Insert message
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: hasContent ? content.trim() : '',
        photo_urls: hasPhotos ? photo_urls : [],
      })
      .select('*')
      .single();

    if (messageError) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    const messageWithProfile: Message = {
      id: newMessage.id,
      conversation_id: newMessage.conversation_id,
      sender_id: newMessage.sender_id,
      content: newMessage.content,
      is_system_message: newMessage.is_system_message ?? false,
      system_message_type: newMessage.system_message_type as Message['system_message_type'],
      photo_urls: newMessage.photo_urls ?? [],
      created_at: newMessage.created_at ?? new Date().toISOString(),
      updated_at: newMessage.updated_at ?? new Date().toISOString(),
      deleted_at: newMessage.deleted_at,
      sender: {
        id: senderProfile?.id || user.id,
        full_name: senderProfile?.full_name || null,
        avatar_url: senderProfile?.avatar_url || null,
      },
    };

    // Send email notification to the other party (only for transaction conversations)
    if (conversation.order_id) {
      const recipientId = conversation.buyer_id === user.id
        ? conversation.seller_id
        : conversation.buyer_id;

      sendNewMessageEmailAsync({
        recipientId,
        senderId: user.id,
        orderId: conversation.order_id,
        messageContent: hasContent ? content.trim() : '',
        hasPhotos: !!hasPhotos,
      });
    }

    return NextResponse.json(
      { message: messageWithProfile },
      { status: 201 }
    );
  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
