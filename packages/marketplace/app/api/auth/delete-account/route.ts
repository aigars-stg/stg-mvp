import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if already soft deleted
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('deleted_at')
      .eq('id', user.id)
      .single();

    if (profile?.deleted_at) {
      return NextResponse.json(
        { error: 'Account already deleted' },
        { status: 400 }
      );
    }

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // SOFT DELETE STRATEGY (GDPR Article 17.3.e - legal claims defense)
    // Data retained for 90 days for dispute resolution, then permanently deleted
    // Email anonymized immediately to allow reuse, but account recoverable for 14 days

    // Calculate recovery deadline (14 days from now)
    const recoveryDeadline = new Date();
    recoveryDeadline.setDate(recoveryDeadline.getDate() + 14);

    // Step 1: Soft delete user profile and anonymize PII
    const { error: softDeleteError } = await supabase
      .from('user_profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: 'user_request',
        recovery_deadline: recoveryDeadline.toISOString(),
        original_email: user.email, // Store for recovery
        full_name: 'Deleted User',
        phone: null,
        avatar_url: null,
      })
      .eq('id', user.id);

    if (softDeleteError) {
      console.error('Error soft deleting profile:', softDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    // Step 2: Delete avatar from storage immediately (PII anonymization)
    try {
      const { data: files } = await supabase
        .storage
        .from('listing-photos')
        .list(`${user.id}/avatar`);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/avatar/${file.name}`);
        await supabase
          .storage
          .from('listing-photos')
          .remove(filePaths);
      }
    } catch (storageError) {
      console.error('Error deleting avatar:', storageError);
      // Continue even if avatar deletion fails
    }

    // Step 3: Use service role to sign out all devices (revoke refresh tokens)
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

    await supabaseAdmin.auth.admin.signOut(user.id, 'global');

    // Step 4: Anonymize email in auth.users to make it reusable immediately
    // Pattern: deleted-{user_id}@internal.local
    const anonymizedEmail = `deleted-${user.id}@internal.local`;

    const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email: anonymizedEmail }
    );

    if (emailUpdateError) {
      console.error('Error anonymizing email:', emailUpdateError);
      // Don't fail the whole deletion if email update fails
      // User can still sign in during grace period with original email stored in profile
    }

    // Step 5: Sign out current session
    await supabase.auth.signOut();

    // Note: We DO NOT delete:
    // - auth.users record (retained for 90 days, email anonymized)
    // - user_profiles record (soft deleted, retained for 90 days)
    // - listings and transaction history (retained for dispute resolution)
    // - listing photos (retained for dispute resolution)
    //
    // User CAN recover account within 14 days via recovery endpoint
    // After 14 days: recovery not possible, but data retained for GDPR
    // After 90 days: scheduled cleanup job permanently deletes everything
    //
    // Email is immediately reusable for new account signups

    return NextResponse.json({
      success: true,
      message: 'Account deleted. You can recover your account within 14 days. Data will be permanently removed after 90 days retention period.',
      recovery_deadline: recoveryDeadline.toISOString()
    });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
