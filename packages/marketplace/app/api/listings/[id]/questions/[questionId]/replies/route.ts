import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { ListingQuestion, QUESTION_CONSTRAINTS } from '@/lib/types/question';

/**
 * POST /api/listings/[id]/questions/[questionId]/replies
 * Creates a reply to a question (authenticated)
 *
 * - Anyone logged in can reply
 * - Parent must be a top-level question (not a reply) to enforce 2-level max depth
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id: listingId, questionId: parentId } = params;
    const body = await request.json();

    // Validate content
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: 'Reply content is required' },
        { status: 400 }
      );
    }

    if (content.length > QUESTION_CONSTRAINTS.MAX_LENGTH) {
      return NextResponse.json(
        { error: `Reply must be ${QUESTION_CONSTRAINTS.MAX_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Verify parent question exists and is a top-level question (not a reply)
    const { data: parentQuestion, error: parentError } = await supabase
      .from('listing_questions')
      .select('id, listing_id, parent_id, deleted_at, user_id')
      .eq('id', parentId)
      .single();

    if (parentError || !parentQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (parentQuestion.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot reply to a deleted question' },
        { status: 400 }
      );
    }

    if (parentQuestion.listing_id !== listingId) {
      return NextResponse.json(
        { error: 'Question does not belong to this listing' },
        { status: 400 }
      );
    }

    // Enforce 2-level depth: parent must be a top-level question
    if (parentQuestion.parent_id !== null) {
      return NextResponse.json(
        { error: 'Cannot reply to a reply. Maximum thread depth is 2 levels.' },
        { status: 400 }
      );
    }

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, game_name')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot reply on inactive listings' },
        { status: 400 }
      );
    }

    // Create the reply
    const { data: reply, error: insertError } = await supabase
      .from('listing_questions')
      .insert({
        listing_id: listingId,
        user_id: user.id,
        content,
        parent_id: parentId,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Fetch the reply with author info
    const { data: replyWithAuthor } = await supabase
      .from('listing_questions_with_author')
      .select('*')
      .eq('id', reply.id)
      .single();

    const formattedReply: ListingQuestion = {
      id: replyWithAuthor?.id ?? reply.id,
      listing_id: replyWithAuthor?.listing_id ?? listingId,
      user_id: replyWithAuthor?.user_id ?? user.id,
      content: replyWithAuthor?.content ?? content,
      parent_id: replyWithAuthor?.parent_id ?? parentId,
      created_at: replyWithAuthor?.created_at ?? new Date().toISOString(),
      updated_at: replyWithAuthor?.updated_at ?? new Date().toISOString(),
      author: {
        id: replyWithAuthor?.user_id ?? user.id,
        full_name: replyWithAuthor?.author_name ?? 'Unknown',
        avatar_url: replyWithAuthor?.author_avatar ?? null,
      },
      is_seller: replyWithAuthor?.is_seller ?? false,
    };

    // Send email notification to question author (fire-and-forget, skip if replying to own question)
    if (parentQuestion.user_id !== user!.id) {
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', parentQuestion.user_id)
        .single();

      const { data: replierProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user!.id)
        .single();

      if (authorProfile?.email) {
        const { sendNewReplyEmail } = await import('@/lib/email/send-question-emails');
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://secondturn.games';
        sendNewReplyEmail({
          recipientName: authorProfile.full_name || 'User',
          recipientEmail: authorProfile.email,
          gameName: listing.game_name || 'a listing',
          replyContent: content,
          authorName: replierProfile?.full_name || 'Someone',
          listingUrl: `${baseUrl}/en/games/${listingId}`,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      reply: formattedReply,
      message: 'Reply posted successfully',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create reply');
  }
}
