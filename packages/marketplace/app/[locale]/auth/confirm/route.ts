import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { logLoginActivity, getClientIP } from '@/lib/auth/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const locale = params.locale || 'en';

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  let error = null;
  let user = null;

  // Handle various auth flows
  if (token_hash && type) {
    // Email Link / Magic Link Flow
    const { data: { user: otpUser }, error: otpError } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (otpError) error = otpError;
    else user = otpUser;
  } else if (code) {
    // OAuth Code FLow
    const { data: { user: oauthUser }, error: oauthError } = await supabase.auth.exchangeCodeForSession(code);
    if (oauthError) error = oauthError;
    else user = oauthUser;
  } else {
    // No auth params
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (error) {
    console.error('Auth confirming error:', error);
    // Redirect to auth with error
    return NextResponse.redirect(new URL('/auth?error=verification_failed', request.url));
  }

  // Log Activity if successful
  if (user) {
    try {
      const ipAddress = getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'Unknown';

      // Optional: Get geo-location from IP (using Cloudflare headers if available)
      const country = request.headers.get('cf-ipcountry') || null;
      const city = request.headers.get('cf-ipcity') || null;

      await logLoginActivity({
        userId: user.id,
        ipAddress,
        userAgent,
        country,
        city,
        useServiceRole: true  // Use service role to bypass RLS (session not set yet in current request)
      });
    } catch (logError) {
      console.error('Failed to log login activity:', logError);
      // Non-blocking, continue
    }

    // For OAuth users: capture locale if not set (OAuth providers don't send auth emails)
    // This ensures future emails (password reset, email change) use the correct locale
    if (code && !user.user_metadata?.preferred_locale) {
      try {
        await supabase.auth.updateUser({
          data: { preferred_locale: locale }
        });
      } catch (localeError) {
        console.error('Failed to set preferred_locale:', localeError);
        // Non-blocking, continue
      }
    }
  }

  // Redirect to application
  return NextResponse.redirect(new URL(next, request.url));
}
