import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * Check if an email already exists in the system.
 * Used by the email-first auth flow to determine if user is new or returning.
 *
 * Uses service role client to query auth.users (requires admin access).
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if email exists in user_profiles table
    // Using service role to avoid RLS restrictions
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('Error checking email:', error);
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      );
    }

    // Get full user details to check authentication methods
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(data?.id);

    if (userError || !user) {
      console.error('Error fetching user details:', userError);
      return NextResponse.json({ exists: true, providers: [] });
    }

    // Extract providers from identities
    const providers = Array.from(new Set(
      (user.identities || []).map((identity) => identity.provider)
    ));

    return NextResponse.json({
      exists: true,
      providers,
    });
  } catch (error: any) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
