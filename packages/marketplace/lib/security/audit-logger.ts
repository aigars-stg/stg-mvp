import { createServiceClient } from '@/lib/supabase/client';
import type { NextRequest } from 'next/server';

/**
 * Security audit event types
 *
 * These events are logged for compliance (PCI DSS 10.2, GDPR) and security monitoring.
 * Retention: 1 year (auto-purged weekly via pg_cron)
 */
export type AuditEventType =
  // Authentication events
  | 'login'                    // Successful login (magic link or OAuth)
  | 'logout'                   // User logout
  | 'failed_login'             // Failed login attempt
  | 'magic_link_sent'          // Magic link generated and emailed
  | 'magic_link_used'          // User authenticated via magic link
  | 'magic_link_expired'       // Magic link expired before use
  | 'oauth_login'              // OAuth authentication (Google/Facebook)
  // Security events
  | 'rate_limit_hit'           // Rate limit exceeded
  | 'account_locked'           // Account locked after N failed logins
  | 'suspicious_activity'      // Anomalous behavior detected
  | 'unusual_login'            // Login from new country/device
  // Admin/data events
  | 'admin_action'             // Seller updates listings/prices
  | 'payment_processed'        // Order payment completed
  | 'sensitive_data_accessed'  // PII export/view
  | 'data_export'              // GDPR data export
  | 'account_deleted';         // Account deletion

/**
 * Metadata structure for different event types
 */
export interface AuditEventMetadata {
  // Common fields
  action?: string;
  resource?: string;
  resourceId?: string;
  // Authentication context
  provider?: 'magic_link' | 'google' | 'facebook';
  email?: string;
  // Security context
  reason?: string;
  limitName?: string;
  limitRemaining?: number;
  // Location context (from Cloudflare headers)
  country?: string | null;
  city?: string | null;
  // Device context
  deviceType?: string;
  browser?: string;
  os?: string;
  // Change context (for admin_action)
  oldValue?: unknown;
  newValue?: unknown;
  // Error context
  errorCode?: string;
  errorMessage?: string;
  // Additional context
  [key: string]: unknown;
}

/**
 * Get client IP address from request headers
 * Checks multiple headers in priority order
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
 * Log a security event to the audit log
 *
 * Uses service role client to bypass RLS since this is a system operation.
 * Events are retained for 1 year per PCI DSS requirements.
 *
 * @param eventType - Type of security event
 * @param userId - User ID (null for anonymous events like failed login)
 * @param metadata - Additional context about the event
 * @param request - Optional NextRequest to extract IP/user agent
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  userId: string | null,
  metadata: AuditEventMetadata = {},
  request?: NextRequest | Request
): Promise<{ success: boolean; error?: Error }> {
  try {
    const supabase = createServiceClient();

    // Extract request details if available
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      const headers = request.headers;
      ipAddress = getClientIP(headers);
      userAgent = headers.get('user-agent');

      // Add location context from Cloudflare headers if not already in metadata
      if (!metadata.country) {
        metadata.country = headers.get('cf-ipcountry');
      }
      if (!metadata.city) {
        metadata.city = headers.get('cf-ipcity');
      }
    }

    // Note: security_audit_log table created in migration 075
    // Type assertion needed until database types are regenerated after migration
    const { error } = await (supabase as any)
      .from('security_audit_log')
      .insert({
        event_type: eventType,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata,
      });

    if (error) {
      console.error('[AuditLogger] Failed to log security event:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (error) {
    console.error('[AuditLogger] Exception logging security event:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Convenience function to log rate limit events
 */
export async function logRateLimitHit(
  userId: string | null,
  limitName: string,
  remaining: number,
  request: NextRequest | Request
): Promise<void> {
  await logSecurityEvent('rate_limit_hit', userId, {
    limitName,
    limitRemaining: remaining,
    action: 'rate_limit_exceeded',
  }, request);
}

/**
 * Convenience function to log authentication events
 */
export async function logAuthEvent(
  eventType: 'login' | 'logout' | 'failed_login' | 'magic_link_sent' | 'magic_link_used' | 'oauth_login',
  userId: string | null,
  metadata: AuditEventMetadata,
  request?: NextRequest | Request
): Promise<void> {
  await logSecurityEvent(eventType, userId, metadata, request);
}

/**
 * Convenience function to log unusual login detection
 */
export async function logUnusualLogin(
  userId: string,
  reason: string,
  request: NextRequest | Request
): Promise<void> {
  await logSecurityEvent('unusual_login', userId, {
    reason,
    action: 'unusual_login_detected',
  }, request);
}

/**
 * Convenience function to log admin/seller actions
 */
export async function logAdminAction(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  changes?: { oldValue?: unknown; newValue?: unknown },
  request?: NextRequest | Request
): Promise<void> {
  await logSecurityEvent('admin_action', userId, {
    action,
    resource,
    resourceId,
    ...changes,
  }, request);
}
