import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { logLoginActivity, getClientIP } from '@/lib/auth/activity-logger';

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

    // Check for Authorization header (Bearer token)
    const authHeader = request.headers.get('Authorization');
    let user;
    let userError;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Authenticate using the access token
      const token = authHeader.split(' ')[1];
      const { data, error } = await supabase.auth.getUser(token);
      user = data.user;
      userError = error;
    } else {
      // Fallback to cookie-based auth
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      userError = error;
    }

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get IP and user agent
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Optional: Get geo-location from IP (using Cloudflare headers if available)
    const country = request.headers.get('cf-ipcountry') || null;
    const city = request.headers.get('cf-ipcity') || null;

    // Log activity using shared helper
    await logLoginActivity({
      supabase,
      userId: user.id,
      ipAddress,
      userAgent,
      country,
      city
    });

    return NextResponse.json({ success: true, logged: true });
  } catch (error: any) {
    console.error('Login activity error:', error);
    // Don't fail the request if logging fails
    return NextResponse.json({ success: true, logged: false });
  }
}
