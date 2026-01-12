/**
 * Request helper utilities for extracting client information
 *
 * Consolidated from:
 * - lib/auth/activity-logger.ts
 * - lib/security/audit-logger.ts
 * - lib/security/login-detector.ts
 * - lib/ratelimit.ts
 */

/**
 * Result of parsing a user agent string
 */
export interface ParsedUserAgent {
  /** Combined string like "Chrome on Windows" */
  device: string;
  /** Device category: 'desktop', 'mobile', or 'tablet' */
  deviceType: 'desktop' | 'mobile' | 'tablet';
  /** Browser name */
  browser: string;
  /** Operating system */
  os: string;
}

/**
 * Parse user agent string to extract device information
 *
 * @param userAgent - The user agent string from request headers
 * @returns Parsed device information
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/ipad|tablet/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|android|iphone|ipod/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Detect browser (order matters - check specific patterns before generic ones)
  let browser = 'Unknown';
  if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  } else if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  }

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  return {
    device: `${browser} on ${os}`,
    deviceType,
    browser,
    os,
  };
}

/**
 * Get client IP address from request headers
 *
 * Checks headers in priority order:
 * 1. cf-connecting-ip (Cloudflare - most reliable when using CF)
 * 2. x-forwarded-for (standard for proxies, takes first IP)
 * 3. x-real-ip (nginx)
 *
 * @param headers - Request headers object
 * @returns IP address or 'unknown'
 */
export function getClientIP(headers: Headers): string {
  // Cloudflare's connecting IP (most reliable when using CF)
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  // X-Forwarded-For (standard for proxies, can have multiple IPs)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  // X-Real-IP (nginx)
  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  return 'unknown';
}

/**
 * Format location string from country and city
 *
 * @param country - Country code or name (nullable)
 * @param city - City name (nullable)
 * @returns Formatted location string
 */
export function formatLocation(country: string | null, city: string | null): string {
  const parts = [city, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}
