import { createServiceClient } from '@/lib/supabase/client';
import { getClientIP } from './audit-logger';
import type { NextRequest } from 'next/server';

/**
 * Result of unusual login detection
 */
export interface UnusualLoginResult {
  isUnusual: boolean;
  reasons: string[];
  shouldAlert: boolean;  // Whether to send email alert
  loginDetails: {
    country: string | null;
    city: string | null;
    device: string;
    browser: string;
    os: string;
    ipAddress: string;
  };
}

/**
 * Parse user agent to extract device information
 */
function parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType = 'Desktop';
  if (/mobile|android|iphone|ipod/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet/i.test(ua)) {
    deviceType = 'Tablet';
  }

  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux') && !ua.includes('android')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';

  return {
    device: `${browser} on ${os}`,
    browser,
    os,
  };
}

/**
 * Check if a login is unusual based on historical patterns
 *
 * Unusual criteria:
 * 1. New country (never logged in from before)
 * 2. New device signature (browser + OS combination)
 * 3. Multiple failed login attempts recently
 *
 * @param userId - The user's ID
 * @param request - The current request to extract IP/headers
 * @returns UnusualLoginResult with detection details
 */
export async function checkUnusualLogin(
  userId: string,
  request: NextRequest | Request
): Promise<UnusualLoginResult> {
  const supabase = createServiceClient();
  const headers = request.headers;

  // Extract current login details
  const ipAddress = getClientIP(headers);
  const userAgent = headers.get('user-agent') || 'Unknown';
  const currentCountry = headers.get('cf-ipcountry') || null;
  const currentCity = headers.get('cf-ipcity') || null;
  const { device, browser, os } = parseUserAgent(userAgent);

  const reasons: string[] = [];

  // Get user's recent login history (last 30 days, up to 50 entries)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentLogins, error } = await supabase
    .from('login_activity')
    .select('ip_address, country, browser, os')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[LoginDetector] Failed to fetch login history:', error);
    // On error, assume not unusual to avoid false positives
    return {
      isUnusual: false,
      reasons: [],
      shouldAlert: false,
      loginDetails: {
        country: currentCountry,
        city: currentCity,
        device,
        browser,
        os,
        ipAddress,
      },
    };
  }

  // If user has no login history, this is their first login - not unusual
  if (!recentLogins || recentLogins.length === 0) {
    return {
      isUnusual: false,
      reasons: [],
      shouldAlert: false,
      loginDetails: {
        country: currentCountry,
        city: currentCity,
        device,
        browser,
        os,
        ipAddress,
      },
    };
  }

  // Check 1: New country
  if (currentCountry) {
    const knownCountries = new Set(
      recentLogins
        .map(login => login.country)
        .filter((c): c is string => c !== null)
    );

    if (knownCountries.size > 0 && !knownCountries.has(currentCountry)) {
      reasons.push(`New country: ${currentCountry}`);
    }
  }

  // Check 2: New device signature (browser + OS combination)
  const currentSignature = `${browser}:${os}`;
  const knownSignatures = new Set(
    recentLogins.map(login => `${login.browser}:${login.os}`)
  );

  if (!knownSignatures.has(currentSignature)) {
    reasons.push(`New device: ${device}`);
  }

  // Determine if this login is unusual
  const isUnusual = reasons.length > 0;

  // Only alert for significant changes (new country is more concerning than new device)
  const shouldAlert = reasons.some(r => r.startsWith('New country:'));

  return {
    isUnusual,
    reasons,
    shouldAlert,
    loginDetails: {
      country: currentCountry,
      city: currentCity,
      device,
      browser,
      os,
      ipAddress,
    },
  };
}

/**
 * Format location string from country and city
 */
export function formatLocation(country: string | null, city: string | null): string {
  if (city && country) {
    return `${city}, ${country}`;
  } else if (country) {
    return country;
  } else if (city) {
    return city;
  }
  return 'Unknown location';
}
