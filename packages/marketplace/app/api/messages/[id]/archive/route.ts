import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ArchiveConversationRequest } from '@/lib/types/message';

/**
 * POST /api/messages/[id]/archive
 * Archive or unarchive a conversation for the current user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body: ArchiveConversationRequest = await request.json();
    const { archived } = body;

    // Validate archived parameter
    if (typeof archived !== 'boolean') {
      return NextResponse.json(
        { error: 'archived must be a boolean' },
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

    // Determine which field to update based on user role
    const isBuyer = conversation.buyer_id === user.id;
    const archiveField = isBuyer ? 'buyer_archived_at' : 'seller_archived_at';
    const archiveValue = archived ? new Date().toISOString() : null;

    // Update archive status
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ [archiveField]: archiveValue })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating archive status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update archive status' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: archived ? 'Conversation archived' : 'Conversation unarchived',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Archive conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
