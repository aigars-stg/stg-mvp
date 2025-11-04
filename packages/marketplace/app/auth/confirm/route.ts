import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      // Redirect to the home page or wherever you want after email verification
      return NextResponse.redirect(new URL(next, request.url));
    }

    // If there's an error, redirect to an error page or sign-in
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', request.url));
  }

  // No token or type provided, redirect to sign-in
  return NextResponse.redirect(new URL('/auth/signin', request.url));
}
