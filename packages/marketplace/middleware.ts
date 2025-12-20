import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
        console.log('🔐 [Middleware] Stale token detected, clearing session');
        // Clear auth cookies
        response.cookies.delete('sb-access-token');
        response.cookies.delete('sb-refresh-token');
        // Also try Supabase's default cookie names
        response.cookies.delete(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`);
      } else {
        console.error('🔐 [Middleware] Auth error:', error.message);
      }
    } else {
      user = data.user;
    }
  } catch (error) {
    console.error('🔐 [Middleware] Unexpected auth error:', error);
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/sell', '/account', '/my-listings', '/seller'];
  // Public routes that should NOT require auth (even if they match protected patterns)
  const publicRoutes = ['/seller/terms'];
  const authRoutes = ['/auth/signin', '/auth/signup'];

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname === route
  );
  const isProtectedRoute = !isPublicRoute && protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Debug logging
  if (isProtectedRoute) {
    console.log(`🔐 [Middleware] Protected route: ${request.nextUrl.pathname}`);
    console.log(`🔐 [Middleware] User authenticated: ${!!user}`);
    if (user) {
      console.log(`🔐 [Middleware] User ID: ${user.id}`);
    }
  }

  // Redirect to signin if accessing protected route without auth
  if (isProtectedRoute && !user) {
    console.log(`❌ [Middleware] Redirecting to sign-in (no auth)`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/signin';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect away from auth pages if already logged in
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
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
