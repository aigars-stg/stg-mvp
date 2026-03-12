import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import type { SupabaseClient as BaseSupabaseClient, User } from '@supabase/supabase-js';

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>;

type AuthSuccess = {
  response: null;
  user: User;
  supabase: SupabaseClient;
};

type AuthFailure = {
  response: NextResponse;
  user: null;
  supabase: null;
};

type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authentication middleware for API routes.
 * Returns authenticated user and supabase client, or an error response.
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const { response, user, supabase } = await requireAuth();
 *   if (response) return response;
 *
 *   // TypeScript now knows user and supabase are non-null
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      ),
      user: null,
      supabase: null,
    };
  }

  return { response: null, user, supabase };
}

// --- Staff auth ---

type StaffAuthSuccess = {
  response: null;
  user: User;
  serviceClient: BaseSupabaseClient;
};

type StaffAuthFailure = {
  response: NextResponse;
  user: null;
  serviceClient: null;
};

type StaffAuthResult = StaffAuthSuccess | StaffAuthFailure;

/**
 * Staff authentication middleware for API routes.
 * Verifies the user is authenticated AND has is_staff = true.
 * Returns a service-role client for admin operations.
 *
 * Usage:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { response, user, serviceClient } = await requireStaffAuth();
 *   if (response) return response;
 *   // user is authenticated staff, serviceClient bypasses RLS
 * }
 * ```
 */
export async function requireStaffAuth(): Promise<StaffAuthResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
      user: null,
      serviceClient: null,
    };
  }

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .select('is_staff')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_staff) {
    return {
      response: NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      ),
      user: null,
      serviceClient: null,
    };
  }

  return { response: null, user, serviceClient };
}
