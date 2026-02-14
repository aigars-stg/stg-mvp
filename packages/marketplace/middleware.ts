import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create i18n middleware
const intlMiddleware = createMiddleware(routing);

// Derive locale pattern from routing config (avoids hardcoding 'en|lv')
const localePattern = routing.locales.join('|');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1: Handle i18n routing FIRST (before auth)
  // Skip i18n for API routes and static assets
  const shouldSkipI18n =
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|js|json|xml|txt|map|ico|woff|woff2)$/);

  let response: NextResponse;

  if (shouldSkipI18n) {
    // Skip i18n, create response for Supabase auth
    response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  } else {
    // Apply i18n middleware
    const intlResponse = intlMiddleware(request);
    if (intlResponse) {
      response = intlResponse;
    } else {
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Validate session with Supabase server (secure - prevents cookie forgery)
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      // Handle stale/invalid refresh tokens
      if (error.code === 'refresh_token_not_found' ||
          error.code === 'invalid_refresh_token' ||
          error.message?.includes('Refresh Token')) {
        // Clear auth cookies silently
        response.cookies.delete('sb-access-token');
        response.cookies.delete('sb-refresh-token');
        // Also try Supabase's default cookie names
        response.cookies.delete(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`);
      }
      // Auth errors are handled silently - session missing is normal for anonymous users
    } else {
      user = data.user;
    }
  } catch {
    // Auth errors handled silently
  }

  // Step 2: Set locale cookie for next-intl based on user preference
  // This allows next-intl to handle the redirect correctly without creating loops
  // Skip DB query if cookie already exists (1-year maxAge, only need to set once)
  if (user && !shouldSkipI18n && !request.cookies.get('NEXT_LOCALE')) {
    try {
      // Fetch user's preferred locale from database
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('preferred_locale')
        .eq('id', user.id)
        .single();

      // Set NEXT_LOCALE cookie so next-intl uses the user's preference
      if (profile?.preferred_locale) {
        response.cookies.set('NEXT_LOCALE', profile.preferred_locale, {
          path: '/',
          maxAge: 31536000, // 1 year
        });
      }
    } catch (error) {
      // Silently fail - locale detection is not critical
      console.error('[Middleware] Locale cookie error:', error);
    }
  }

  // Protected routes that require authentication
  // Note: Must handle both /route and /[locale]/route patterns
  const protectedRoutes = ['/sell', '/account', '/my-listings', '/seller'];
  const publicRoutes = ['/seller/terms'];
  const authRoutes = ['/auth/signin', '/auth/signup', '/auth'];

  // Helper to check if path matches route (with or without locale prefix)
  const matchesRoute = (path: string, route: string) => {
    // Check direct match: /sell
    if (path === route || path.startsWith(route + '/')) return true;
    // Check with locale prefix: /lv/sell
    const pattern = new RegExp(`^/(${localePattern})${route}(/|$)`);
    return pattern.test(path);
  };

  const isPublicRoute = publicRoutes.some((route) => matchesRoute(pathname, route));
  const isProtectedRoute = !isPublicRoute && protectedRoutes.some((route) => matchesRoute(pathname, route));
  const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));

  // Redirect to signin if accessing protected route without auth
  // Preserve locale in redirect URL
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    // Extract locale from pathname if present
    const localeMatch = pathname.match(new RegExp(`^/(${localePattern})`));
    const locale = localeMatch ? localeMatch[1] : '';
    redirectUrl.pathname = locale ? `/${locale}/auth` : '/auth';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect away from auth pages if already logged in
  // Preserve locale in redirect URL
  if (isAuthRoute && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/';
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectTo;
    redirectUrl.searchParams.delete('redirectTo');
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// Specify which routes should run the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that handle their own auth
     */
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|json|xml|txt|map|ico|woff|woff2)$).*)',
  ],
};
