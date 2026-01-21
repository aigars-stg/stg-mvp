import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { ListingQuestion, QUESTION_CONSTRAINTS } from '@/lib/types/question';

/**
 * PATCH /api/listings/[id]/questions/[questionId]
 * Updates a question (only the author can update)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { questionId } = params;
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

    // Verify question exists and belongs to user
    const { data: existingQuestion, error: fetchError } = await supabase
      .from('listing_questions')
      .select('id, user_id, deleted_at')
      .eq('id', questionId)
      .single();

    if (fetchError || !existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (existingQuestion.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot edit a deleted question' },
        { status: 400 }
      );
    }

    if (existingQuestion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own questions' },
        { status: 403 }
      );
    }

    // Update the question
    const { data: question, error: updateError } = await supabase
      .from('listing_questions')
      .update({ content })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Fetch the updated question with author info
    const { data: questionWithAuthor } = await supabase
      .from('listing_questions_with_author')
      .select('*')
      .eq('id', question.id)
      .single();

    const formattedQuestion: ListingQuestion = {
      id: questionWithAuthor?.id ?? question.id,
      listing_id: questionWithAuthor?.listing_id ?? params.id,
      user_id: questionWithAuthor?.user_id ?? user.id,
      content: questionWithAuthor?.content ?? content,
      parent_id: questionWithAuthor?.parent_id ?? null,
      created_at: questionWithAuthor?.created_at ?? new Date().toISOString(),
      updated_at: questionWithAuthor?.updated_at ?? new Date().toISOString(),
      author: {
        id: questionWithAuthor?.user_id ?? user.id,
        full_name: questionWithAuthor?.author_name ?? 'Unknown',
        avatar_url: questionWithAuthor?.author_avatar ?? null,
      },
      is_seller: questionWithAuthor?.is_seller ?? false,
    };

    return NextResponse.json({
      question: formattedQuestion,
      message: 'Question updated successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Update question');
  }
}

/**
 * DELETE /api/listings/[id]/questions/[questionId]
 * Soft deletes a question (only the author can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { questionId } = params;

    // Verify question exists and belongs to user
    const { data: existingQuestion, error: fetchError } = await supabase
      .from('listing_questions')
      .select('id, user_id, deleted_at')
      .eq('id', questionId)
      .single();

    if (fetchError || !existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (existingQuestion.deleted_at) {
      return NextResponse.json(
        { error: 'Question is already deleted' },
        { status: 400 }
      );
    }

    if (existingQuestion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own questions' },
        { status: 403 }
      );
    }

    // Soft delete the question
    const { error: deleteError } = await supabase
      .from('listing_questions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', questionId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Question deleted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Delete question');
  }
}
