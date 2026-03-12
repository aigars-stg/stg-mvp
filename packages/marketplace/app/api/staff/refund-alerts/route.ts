import { NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/refund-alerts
 *
 * Returns count of orders needing refund attention:
 * - Cancelled with no refund processed
 * - Failed refunds
 * - Manual SEPA required (not yet completed)
 */
export async function GET() {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    // Count orders needing refund attention
    const { count, error: countError } = await serviceClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .or(
        'and(status.eq.cancelled,refunded_at.is.null,everypay_payment_reference.not.is.null),' +
        'refund_status.eq.failed,' +
        'and(refund_status.eq.manual_sepa_required,refund_completed_at.is.null)'
      );

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
