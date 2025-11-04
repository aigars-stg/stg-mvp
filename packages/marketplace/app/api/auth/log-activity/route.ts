import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper to parse user agent
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { deviceType, browser, os };
}

// Helper to get IP address
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get IP and user agent
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Optional: Get geo-location from IP (using Cloudflare headers if available)
    const country = request.headers.get('cf-ipcountry') || null;
    const city = request.headers.get('cf-ipcity') || null;

    // Insert login activity
    const { error: insertError } = await supabase
      .from('login_activity')
      .insert({
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        browser,
        os,
        country,
        city,
      });

    if (insertError) {
      console.error('Error logging activity:', insertError);
      // Don't fail the request if logging fails
      return NextResponse.json({ success: true, logged: false });
    }

    return NextResponse.json({ success: true, logged: true });
  } catch (error: any) {
    console.error('Login activity error:', error);
    // Don't fail the request if logging fails
    return NextResponse.json({ success: true, logged: false });
  }
}
