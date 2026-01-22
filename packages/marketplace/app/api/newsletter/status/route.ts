import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/newsletter/status
 * Get current subscription status for authenticated user
 */
export async function GET() {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Find subscription by user_id or email
    const { data: subscription } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, unsubscribed_at')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (!subscription || subscription.unsubscribed_at) {
      return NextResponse.json({
        subscribed: false,
        email: user.email,
      });
    }

    return NextResponse.json({
      subscribed: true,
      email: subscription.email,
    });
  } catch (error) {
    return handleApiError(error, 'Get newsletter status');
  }
}
