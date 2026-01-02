import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
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

    const supabase = await createServerSupabase();

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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
