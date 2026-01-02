import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

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
