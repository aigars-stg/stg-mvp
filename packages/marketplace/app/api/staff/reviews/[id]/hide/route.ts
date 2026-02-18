import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { createServiceClient } from '@/lib/supabase/client';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/staff/reviews/[id]/hide
 *
 * Staff endpoint to hide a review.
 * Requires is_staff on user_profiles. Sets is_hidden = true on the review.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const serviceClient = createServiceClient();

    // Check staff access
    const { data: userProfile } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (!userProfile || !userProfile.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    const { id: reviewId } = await params;

    // Set is_hidden = true on the review
    const { error: updateError } = await serviceClient
      .from('seller_reviews')
      .update({ is_hidden: true })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Failed to hide review:', updateError);
      return NextResponse.json(
        { error: 'Failed to hide review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Hide review');
  }
}
