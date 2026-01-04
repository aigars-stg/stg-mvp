import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import {
  ListingQuestion,
  ListingQuestionsResponse,
  ListingQuestionCountResponse,
  QUESTION_CONSTRAINTS,
} from '@/lib/types/question';

/**
 * GET /api/listings/[id]/questions
 * Fetches all questions for a listing (public, no auth required)
 *
 * Query params:
 * - count_only=true: Returns only the question count (lightweight)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: listingId } = params;
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count_only') === 'true';

    const supabase = await createServerSupabase();

    // Count-only mode for badge display (lightweight query)
    if (countOnly) {
      const { data, error } = await supabase.rpc('get_listing_question_count', {
        p_listing_id: listingId,
      });

      if (error) {
        // If function doesn't exist yet (pre-migration), return 0
        if (error.message.includes('function') || error.code === '42883') {
          return NextResponse.json({ count: 0 } satisfies ListingQuestionCountResponse);
        }
        throw error;
      }

      return NextResponse.json({ count: data ?? 0 } satisfies ListingQuestionCountResponse);
    }

    // Full query: fetch questions with author info
    const { data: questions, error: questionsError } = await (supabase as any)
      .from('listing_questions_with_author')
      .select('*')
      .eq('listing_id', listingId)
      .is('parent_id', null) // Top-level questions only
      .order('created_at', { ascending: false });

    if (questionsError) {
      // If view doesn't exist yet (pre-migration), return empty
      if (questionsError.message.includes('relation') || questionsError.code === '42P01') {
        return NextResponse.json({
          questions: [],
          total: 0,
        } satisfies ListingQuestionsResponse);
      }
      throw questionsError;
    }

    // Fetch replies for each question
    const questionIds = questions?.map((q: any) => q.id) || [];

    let repliesByParent: Record<string, ListingQuestion[]> = {};

    if (questionIds.length > 0) {
      const { data: replies, error: repliesError } = await (supabase as any)
        .from('listing_questions_with_author')
        .select('*')
        .in('parent_id', questionIds)
        .order('created_at', { ascending: true });

      if (repliesError && !repliesError.message.includes('relation')) {
        throw repliesError;
      }

      // Group replies by parent_id
      for (const reply of replies || []) {
        if (!repliesByParent[reply.parent_id]) {
          repliesByParent[reply.parent_id] = [];
        }
        repliesByParent[reply.parent_id].push({
          id: reply.id,
          listing_id: reply.listing_id,
          user_id: reply.user_id,
          content: reply.content,
          parent_id: reply.parent_id,
          created_at: reply.created_at,
          updated_at: reply.updated_at,
          author: {
            id: reply.user_id,
            full_name: reply.author_name,
            avatar_url: reply.author_avatar,
          },
          is_seller: reply.is_seller,
        });
      }
    }

    // Transform questions to response format
    const formattedQuestions: ListingQuestion[] = (questions || []).map((q: any) => ({
      id: q.id,
      listing_id: q.listing_id,
      user_id: q.user_id,
      content: q.content,
      parent_id: q.parent_id,
      created_at: q.created_at,
      updated_at: q.updated_at,
      author: {
        id: q.user_id,
        full_name: q.author_name,
        avatar_url: q.author_avatar,
      },
      is_seller: q.is_seller,
      replies: repliesByParent[q.id] || [],
      reply_count: (repliesByParent[q.id] || []).length,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      total: formattedQuestions.length,
    } satisfies ListingQuestionsResponse);
  } catch (error) {
    return handleApiError(error, 'Fetch listing questions');
  }
}

/**
 * POST /api/listings/[id]/questions
 * Creates a new question on a listing (authenticated, cannot be listing owner)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { id: listingId } = params;
    const body = await request.json();

    // Validate content
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: 'Question content is required' },
        { status: 400 }
      );
    }

    if (content.length > QUESTION_CONSTRAINTS.MAX_LENGTH) {
      return NextResponse.json(
        { error: `Question must be ${QUESTION_CONSTRAINTS.MAX_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Verify listing exists and user is not the seller
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('id, seller_id, status')
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
        { error: 'Cannot post questions on inactive listings' },
        { status: 400 }
      );
    }

    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot post questions on your own listing' },
        { status: 403 }
      );
    }

    // Create the question
    const { data: question, error: insertError } = await (supabase as any)
      .from('listing_questions')
      .insert({
        listing_id: listingId,
        user_id: user.id,
        content,
        parent_id: null, // Top-level question
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Fetch the question with author info
    const { data: questionWithAuthor } = await (supabase as any)
      .from('listing_questions_with_author')
      .select('*')
      .eq('id', question.id)
      .single();

    const formattedQuestion: ListingQuestion = {
      id: questionWithAuthor.id,
      listing_id: questionWithAuthor.listing_id,
      user_id: questionWithAuthor.user_id,
      content: questionWithAuthor.content,
      parent_id: questionWithAuthor.parent_id,
      created_at: questionWithAuthor.created_at,
      updated_at: questionWithAuthor.updated_at,
      author: {
        id: questionWithAuthor.user_id,
        full_name: questionWithAuthor.author_name,
        avatar_url: questionWithAuthor.author_avatar,
      },
      is_seller: questionWithAuthor.is_seller,
      replies: [],
      reply_count: 0,
    };

    // TODO: Send email notification to seller (via Resend)
    // This can be added in a follow-up PR

    return NextResponse.json({
      question: formattedQuestion,
      message: 'Question posted successfully',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create listing question');
  }
}
