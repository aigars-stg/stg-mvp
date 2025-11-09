import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { MarkAsReadRequest } from '@/lib/types/message';

/**
 * POST /api/messages/[id]/read
 * Mark messages as read up to a specific message ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body: MarkAsReadRequest = await request.json();
    const { message_id } = body;

    // Validate message_id
    if (!message_id) {
      return NextResponse.json(
        { error: 'message_id is required' },
        { status: 400 }
      );
    }

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

    // Verify conversation exists and user is a participant
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, buyer_id, seller_id')
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
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Verify message exists and belongs to this conversation
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', message_id)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found in this conversation' },
        { status: 404 }
      );
    }

    // Upsert read status
    const { error: upsertError } = await supabase
      .from('message_read_status')
      .upsert(
        {
          user_id: user.id,
          conversation_id: conversationId,
          last_read_message_id: message_id,
          last_read_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,conversation_id',
        }
      );

    if (upsertError) {
      console.error('Error updating read status:', upsertError);
      return NextResponse.json(
        { error: 'Failed to mark as read' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Messages marked as read' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
