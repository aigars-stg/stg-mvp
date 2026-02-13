import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api/error-handler';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';

/**
 * Check if an email already exists in the system.
 * Used by the email-first auth flow to determine if user is new or returning.
 *
 * Performance optimized: Uses auth_providers column from user_profiles
 * instead of making expensive Admin API calls.
 *
 * Fallback: If auth_providers is empty (not yet backfilled), falls back to Admin API.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Rate limit by IP to prevent user enumeration
    const ip = getClientIP(request.headers) || 'unknown';
    const rateLimit = await checkRateLimit('signIn', ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error || 'Too many requests' },
        { status: 429 }
      );
    }

    const supabase = createServiceClient();

    // Query user_profiles for email AND auth_providers in a single query
    // This avoids the expensive Admin API call in most cases
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, auth_providers')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      );
    }

    // Email doesn't exist in the system
    if (!data) {
      return NextResponse.json({
        exists: false,
        providers: [],
      });
    }

    // Check if we have auth_providers cached (populated on sign-in or via backfill)
    const cachedProviders = data.auth_providers;
    if (cachedProviders && Array.isArray(cachedProviders) && cachedProviders.length > 0) {
      // Fast path: use cached providers
      return NextResponse.json({
        exists: true,
        providers: cachedProviders,
      });
    }

    // Fallback: User exists but auth_providers not yet populated
    // This handles users who signed up before the migration or backfill
    // Make Admin API call (expensive but rare after backfill completes)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(data.id);

    if (userError || !user) {
      // User exists in profiles but not in auth - edge case
      return NextResponse.json({ exists: true, providers: [] });
    }

    // Extract providers from identities
    const providers = Array.from(new Set(
      (user.identities || []).map((identity) => identity.provider)
    ));

    // Opportunistically update auth_providers for next time (fire and forget)
    if (providers.length > 0) {
      void (async () => {
        try {
          await supabase
            .from('user_profiles')
            .update({ auth_providers: providers })
            .eq('id', data.id);
        } catch {
          // Ignore errors - non-critical background update
        }
      })();
    }

    return NextResponse.json({
      exists: true,
      providers,
    });
  } catch (error) {
    return handleApiError(error, 'Check email');
  }
}
