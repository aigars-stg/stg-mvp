import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ConversationListItem } from '@/lib/types/message';

/**
 * GET /api/messages
 * List all conversations for the authenticated user
 * Query params:
 * - include_archived: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  try {
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
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get('include_archived') === 'true';

    // Get conversations where user is buyer or seller
    let conversationsQuery = supabase
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
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    // Filter archived conversations if not requested
    if (!includeArchived) {
      conversationsQuery = conversationsQuery.or(`buyer_archived_at.is.null,seller_archived_at.is.null`);
    }

    const { data: conversations, error: conversationsError } = await conversationsQuery;

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [] }, { status: 200 });
    }

    // Get unique listing IDs
    const listingIds = [...new Set(conversations.map(c => c.listing_id))];

    // Get unique user IDs (all buyers and sellers except current user)
    const userIds = [...new Set(
      conversations.flatMap(c => [c.buyer_id, c.seller_id])
        .filter(id => id !== user.id)
    )];

    // Fetch all listings data
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, price, status, photo_urls, game_name')
      .in('id', listingIds);

    const listingsMap = new Map(
      listings?.map(l => [l.id, l]) || []
    );

    // Fetch all user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(
      profiles?.map(p => [p.id, p]) || []
    );

    // Get last message for each conversation
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_id, created_at, is_system_message')
      .in('conversation_id', conversations.map(c => c.id))
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Group messages by conversation and take the first (latest)
    const lastMessageMap = new Map();
    lastMessages?.forEach(msg => {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    });

    // Get unread counts using the database function
    const { data: unreadCounts } = await supabase
      .rpc('get_unread_message_count', { user_uuid: user.id });

    const unreadCountMap = new Map(
      unreadCounts?.map((uc: { conversation_id: string; unread_count: number }) => [uc.conversation_id, uc.unread_count]) || []
    );

    // Build conversation list items
    const conversationList: ConversationListItem[] = conversations.map(conv => {
      const listing = listingsMap.get(conv.listing_id);
      const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
      const otherUserProfile = profilesMap.get(otherUserId);
      const lastMessage = lastMessageMap.get(conv.id);
      const unreadCount = unreadCountMap.get(conv.id) || 0;
      const isArchived = conv.buyer_id === user.id
        ? !!conv.buyer_archived_at
        : !!conv.seller_archived_at;

      return {
        id: conv.id,
        listing_id: conv.listing_id,
        other_user: {
          id: otherUserId,
          full_name: otherUserProfile?.full_name || null,
          avatar_url: otherUserProfile?.avatar_url || null,
        },
        listing: {
          id: listing?.id || conv.listing_id,
          title: listing?.title || 'Unknown Listing',
          price: listing?.price || 0,
          status: listing?.status || 'unknown',
          thumbnail: listing?.photo_urls?.[0] || null,
        },
        last_message: lastMessage ? {
          content: lastMessage.content,
          sender_id: lastMessage.sender_id,
          created_at: lastMessage.created_at,
          is_system_message: lastMessage.is_system_message,
        } : null,
        unread_count: Number(unreadCount),
        is_archived: isArchived,
        updated_at: conv.updated_at,
      };
    });

    return NextResponse.json(
      { conversations: conversationList },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('List conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
