import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Account Recovery Endpoint
 *
 * Allows users to recover their deleted account within 14-day grace period
 * Restores original email and clears soft delete flags
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Step 1: Find the soft-deleted profile by original_email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, deleted_at, recovery_deadline, original_email, email')
      .eq('original_email', email)
      .not('deleted_at', 'is', null)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'No deleted account found with this email' },
        { status: 404 }
      );
    }

    // Step 2: Check if recovery deadline has passed
    const now = new Date();
    const recoveryDeadline = new Date(profile.recovery_deadline);

    if (now > recoveryDeadline) {
      return NextResponse.json(
        {
          error: 'Recovery period has expired. This account can no longer be recovered.',
          recovery_deadline_passed: true
        },
        { status: 400 }
      );
    }

    // Step 3: Verify password using anonymized email from auth.users
    // The email in auth.users is now deleted-{user_id}@internal.local
    const anonymizedEmail = `deleted-${profile.id}@internal.local`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: anonymizedEmail,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Step 4: Use service role to restore original email in auth.users
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const { error: emailRestoreError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { email: profile.original_email }
    );

    if (emailRestoreError) {
      console.error('Error restoring email:', emailRestoreError);
      return NextResponse.json(
        { error: 'Failed to restore account. Please contact support.' },
        { status: 500 }
      );
    }

    // Step 5: Restore user_profiles data and clear soft delete flags
    const { error: restoreError } = await supabase
      .from('user_profiles')
      .update({
        deleted_at: null,
        deletion_reason: null,
        recovery_deadline: null,
        original_email: null,
        // Note: We don't restore full_name, phone, avatar_url as they were anonymized
        // User will need to update these in their profile settings
      })
      .eq('id', profile.id);

    if (restoreError) {
      console.error('Error restoring profile:', restoreError);
      return NextResponse.json(
        { error: 'Failed to restore account profile' },
        { status: 500 }
      );
    }

    // Step 6: Sign out the current session (with anonymized email)
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Account successfully recovered! Please sign in with your email address.',
      email: profile.original_email,
      note: 'Your profile information (name, phone, avatar) was anonymized and will need to be updated in account settings.'
    });

  } catch (error: any) {
    console.error('Account recovery error:', error);
    return NextResponse.json(
      { error: 'Failed to recover account' },
      { status: 500 }
    );
  }
}
