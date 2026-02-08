import { logger } from '@/lib/logger';

interface TurnstileVerifyResult {
  success: boolean;
  errorCodes?: string[];
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Gracefully degrades if TURNSTILE_SECRET_KEY is not configured.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    logger.warn({}, 'TURNSTILE_SECRET_KEY not configured, skipping verification');
    return { success: true };
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  try {
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
      }
    );

    const data = await verifyResponse.json();

    if (!data.success) {
      logger.warn(
        { errorCodes: data['error-codes'] },
        'Turnstile verification failed'
      );
      return { success: false, errorCodes: data['error-codes'] };
    }

    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Turnstile verification request failed');
    // Fail open on network errors to avoid blocking legitimate users
    return { success: true };
  }
}
