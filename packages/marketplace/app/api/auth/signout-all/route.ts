import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/error-handler';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Use service role to sign out all devices
    const supabaseAdmin = createServiceClient();

    // Sign out user from all devices (revokes all refresh tokens)
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(user.id, 'global');

    if (signOutError) {
      return NextResponse.json(
        { error: 'Failed to sign out all devices' },
        { status: 500 }
      );
    }

    // Also sign out current session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Sign out all devices');
  }
}
