import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { handleApiError } from '@/lib/api/error-handler';

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

    // Use service role to bypass RLS and perform admin updates
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

    // Get profile to access original email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('original_email, deleted_at, recovery_deadline')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.deleted_at) {
      return NextResponse.json(
        { message: 'Account is active' },
        { status: 200 }
      );
    }

    // Check if recovery deadline has passed
    if (profile.recovery_deadline && new Date() > new Date(profile.recovery_deadline)) {
      return NextResponse.json(
        { error: 'Recovery period has expired' },
        { status: 403 }
      );
    }

    const originalEmail = profile.original_email;

    if (!originalEmail) {
      return NextResponse.json(
        { error: 'Original email not found' },
        { status: 400 }
      );
    }


    // Step 1: Restore email in auth.users
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email: originalEmail }
    );

    if (authUpdateError) {
      return NextResponse.json(
        { error: 'Failed to restore login credentials' },
        { status: 500 }
      );
    }

    // Step 2: Undelete profile and restore email
    const { error: profileUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        deleted_at: null,
        deletion_reason: null,
        recovery_deadline: null,
        original_email: null,
        email: originalEmail,
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      return NextResponse.json(
        { error: 'Failed to restore profile data' },
        { status: 500 }
      );
    }

    // Step 3: Restore listings (Optional - for now we might leave them as removed or draft?
    // Decision: If we marked them 'removed', we don't automatically republish them to avoid accidents.
    // User can republish them manually.)

    // Step 4: Send recovery confirmation email? (Optional)

    return NextResponse.json({
      success: true,
      message: 'Account successfully recovered'
    });

  } catch (error) {
    return handleApiError(error, 'Recover account');
  }
}
