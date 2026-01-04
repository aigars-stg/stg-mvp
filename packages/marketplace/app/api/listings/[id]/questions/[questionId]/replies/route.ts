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
    const { data: parentQuestion, error: parentError } = await (supabase as any)
      .from('listing_questions')
      .select('id, listing_id, parent_id, deleted_at')
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
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('id, status')
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
    const { data: reply, error: insertError } = await (supabase as any)
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
    const { data: replyWithAuthor } = await (supabase as any)
      .from('listing_questions_with_author')
      .select('*')
      .eq('id', reply.id)
      .single();

    const formattedReply: ListingQuestion = {
      id: replyWithAuthor.id,
      listing_id: replyWithAuthor.listing_id,
      user_id: replyWithAuthor.user_id,
      content: replyWithAuthor.content,
      parent_id: replyWithAuthor.parent_id,
      created_at: replyWithAuthor.created_at,
      updated_at: replyWithAuthor.updated_at,
      author: {
        id: replyWithAuthor.user_id,
        full_name: replyWithAuthor.author_name,
        avatar_url: replyWithAuthor.author_avatar,
      },
      is_seller: replyWithAuthor.is_seller,
    };

    // TODO: Send email notification to question author (if not the seller replying)
    // This can be added in a follow-up PR

    return NextResponse.json({
      reply: formattedReply,
      message: 'Reply posted successfully',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create reply');
  }
}
