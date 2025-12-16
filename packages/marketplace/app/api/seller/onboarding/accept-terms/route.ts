import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

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
      console.error('Error accepting seller terms:', updateError);
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
    console.error('Accept terms error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
