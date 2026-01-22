import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/newsletter/unsubscribe?token={uuid}
 * One-click unsubscribe via token (no auth required)
 * Redirects to confirmation page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const locale = searchParams.get('locale') || 'en';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://secondturn.games';
  const redirectBase = locale === 'en' ? baseUrl : `${baseUrl}/${locale}`;

  if (!token) {
    return NextResponse.redirect(`${redirectBase}/unsubscribed?status=error`);
  }

  try {
    // Use service client to bypass RLS for token-based unsubscribe
    const supabase = createServiceClient();

    // Find subscription by token
    const { data: subscription, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at')
      .eq('unsubscribe_token', token)
      .single();

    if (findError || !subscription) {
      return NextResponse.redirect(`${redirectBase}/unsubscribed?status=error`);
    }

    // Check if already unsubscribed
    if (subscription.unsubscribed_at) {
      return NextResponse.redirect(`${redirectBase}/unsubscribed?status=already`);
    }

    // Unsubscribe
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('❌ [Newsletter] Failed to unsubscribe:', updateError);
      return NextResponse.redirect(`${redirectBase}/unsubscribed?status=error`);
    }

    return NextResponse.redirect(`${redirectBase}/unsubscribed?status=success`);
  } catch (error) {
    console.error('❌ [Newsletter] Unsubscribe error:', error);
    return NextResponse.redirect(`${redirectBase}/unsubscribed?status=error`);
  }
}

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe via authenticated request (from account settings)
 */
export async function POST() {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Find subscription by user_id or email
    const { data: subscription, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (findError || !subscription) {
      // No subscription found - return success (idempotent)
      return NextResponse.json({ success: true, alreadyUnsubscribed: true });
    }

    if (subscription.unsubscribed_at) {
      return NextResponse.json({ success: true, alreadyUnsubscribed: true });
    }

    // Unsubscribe
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', subscription.id);

    if (updateError) {
      return handleApiError(updateError, 'Unsubscribe from newsletter');
    }

    return NextResponse.json({ success: true, alreadyUnsubscribed: false });
  } catch (error) {
    return handleApiError(error, 'Unsubscribe from newsletter');
  }
}
