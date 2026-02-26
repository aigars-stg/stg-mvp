import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import { handleApiError, handleValidationError } from '@/lib/api/error-handler';
import { sendNewsletterWelcomeEmail, notifyStaffNewSubscriber } from '@/lib/email/send-newsletter-emails';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import {
  isValidEmail,
  normalizeEmail,
  type SubscribeRequest,
  type NewsletterLocale,
  type NewsletterSource,
} from '@/lib/newsletter';

/**
 * POST /api/newsletter/subscribe
 * Subscribe to the newsletter
 * Accepts both authenticated and anonymous submissions
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (supports anonymous submissions)
    const ip = getClientIP(request.headers);
    const rateLimit = await checkRateLimit('newsletterSubscribe', ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error, reset: rateLimit.reset },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabase();
    // Use service client for operations that need to bypass RLS
    const serviceClient = createServiceClient();

    // Get user if authenticated (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse request body
    let body: SubscribeRequest;
    try {
      body = (await request.json()) as SubscribeRequest;
    } catch {
      return handleValidationError('Invalid request body', 'Subscribe');
    }

    // Determine email: from body (anonymous/footer) or from auth session (settings toggle)
    const rawEmail = body.email || user?.email;
    if (!rawEmail || !isValidEmail(rawEmail)) {
      return handleValidationError('Please enter a valid email address', 'Subscribe');
    }

    const email = normalizeEmail(rawEmail);
    if (email.length > 254) {
      return handleValidationError('Email address is too long', 'Subscribe');
    }
    const locale: NewsletterLocale = body.locale === 'lv' ? 'lv' : 'en';
    const source: NewsletterSource = body.source || 'footer';

    // Check for existing subscription (use service client to bypass RLS for anonymous users)
    const { data: existing } = await serviceClient
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at, unsubscribe_token')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.unsubscribed_at) {
        // Re-subscribe: clear unsubscribed_at
        const { error: updateError } = await serviceClient
          .from('newsletter_subscribers')
          .update({
            unsubscribed_at: null,
            user_id: user?.id || null,
            locale,
            source,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ [Newsletter] Failed to resubscribe:', updateError);
          // Don't expose error details, just return success (handles gracefully)
        }

        // Send welcome email for re-subscription (only if token exists)
        if (existing.unsubscribe_token) {
          await sendNewsletterWelcomeEmail({
            email,
            locale,
            unsubscribeToken: existing.unsubscribe_token,
          });
        }
      }
      // If already subscribed and active, silently succeed (don't reveal status)
      return NextResponse.json({ success: true });
    }

    // Create new subscription (use service client to ensure it works for anonymous users)
    const { data: newSubscription, error: insertError } = await serviceClient
      .from('newsletter_subscribers')
      .insert({
        email,
        user_id: user?.id || null,
        locale,
        source,
      })
      .select('unsubscribe_token')
      .single();

    if (insertError) {
      // Handle unique constraint violation gracefully (race condition)
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true });
      }
      return handleApiError(insertError, 'Subscribe to newsletter');
    }

    // Send welcome email
    if (newSubscription?.unsubscribe_token) {
      await sendNewsletterWelcomeEmail({
        email,
        locale,
        unsubscribeToken: newSubscription.unsubscribe_token,
      });
    }

    // Notify staff (fire-and-forget, don't block response)
    void notifyStaffNewSubscriber({ email, source, locale });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Subscribe to newsletter');
  }
}
