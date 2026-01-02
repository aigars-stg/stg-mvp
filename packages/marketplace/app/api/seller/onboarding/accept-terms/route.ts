import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
        seller_status: 'onboarding', // Move to onboarding state
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
