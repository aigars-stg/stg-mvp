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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes that require authentication
  const protectedRoutes = ['/sell', '/account', '/my-listings'];
  const authRoutes = ['/auth/signin', '/auth/signup'];

  const isProtectedRoute = protectedRoutes.some((route) =>
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
