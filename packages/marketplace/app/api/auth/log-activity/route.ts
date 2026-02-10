import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { logLoginActivity, getClientIP } from '@/lib/auth/activity-logger';
import { handleApiError } from '@/lib/api/error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

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

    // Log activity using shared helper with service role to bypass RLS
    const result = await logLoginActivity({
      userId: user.id,
      ipAddress,
      userAgent,
      country,
      city,
      useServiceRole: true
    });

    return NextResponse.json({ success: true, logged: result.success });
  } catch (error: unknown) {
    // Don't fail the request if logging fails
    return handleApiError(error, 'Log activity');
  }
}
