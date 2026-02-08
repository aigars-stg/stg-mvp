import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Parse request body
    const body = await request.json();
    const { termsVersion } = body;

    if (!termsVersion) {
      return NextResponse.json(
        { error: 'Terms version is required' },
        { status: 400 }
      );
    }

    // Create or update seller_profiles with terms acceptance
    // Use upsert to create the seller profile if it doesn't exist
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .upsert({
        user_id: user.id,
        seller_terms_accepted_at: new Date().toISOString(),
        seller_terms_version: termsVersion,
        seller_status: 'active',
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to accept terms' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Seller terms accepted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Accept terms');
  }
}
