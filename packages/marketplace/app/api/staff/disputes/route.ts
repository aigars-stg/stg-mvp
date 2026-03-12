import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';

export const dynamic = 'force-dynamic';

type Section = 'needs_action' | 'awaiting_seller' | 'refund_issues' | 'resolved';

/**
 * GET /api/staff/disputes
 *
 * Staff-only endpoint to list disputes for the staff dispute dashboard.
 * Supports filtering by section (needs_action, awaiting_seller, refund_issues, resolved).
 */
export async function GET(request: NextRequest) {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const section = (searchParams.get('section') || 'needs_action') as Section;

    // --- Fetch counts for all sections in parallel ---
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [needsActionCount, awaitingSellerCount, refundIssuesCount, resolvedCount] =
      await Promise.all([
        serviceClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('dispute_status', 'under_review'),
        serviceClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('dispute_status', 'awaiting_seller'),
        serviceClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('refund_status', ['failed', 'manual_sepa_required']),
        serviceClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('dispute_status', 'resolved')
          .gte('dispute_resolved_at', thirtyDaysAgo),
      ]);

    const counts = {
      needs_action: needsActionCount.count || 0,
      awaiting_seller: awaitingSellerCount.count || 0,
      refund_issues: refundIssuesCount.count || 0,
      resolved: resolvedCount.count || 0,
    };

    // --- Build the main query for the selected section ---
    const selectFields = `
      id,
      order_number,
      status,
      total_amount,
      dispute_status,
      dispute_reason,
      dispute_resolution,
      disputed_at,
      dispute_seller_deadline,
      dispute_resolved_at,
      refund_status,
      refund_method,
      payment_method,
      buyer_id,
      seller_id,
      updated_at,
      order_items(game_name)
    `;

    let query = serviceClient.from('orders').select(selectFields);

    switch (section) {
      case 'needs_action':
        query = query
          .eq('dispute_status', 'under_review')
          .order('disputed_at', { ascending: true });
        break;
      case 'awaiting_seller':
        query = query
          .eq('dispute_status', 'awaiting_seller')
          .order('dispute_seller_deadline', { ascending: true });
        break;
      case 'refund_issues':
        query = query
          .in('refund_status', ['failed', 'manual_sepa_required'])
          .order('updated_at', { ascending: false });
        break;
      case 'resolved':
        query = query
          .eq('dispute_status', 'resolved')
          .gte('dispute_resolved_at', thirtyDaysAgo)
          .order('dispute_resolved_at', { ascending: false });
        break;
    }

    const { data: disputes, error: disputesError } = await query;

    if (disputesError) {
      return NextResponse.json(
        { error: 'Failed to fetch disputes' },
        { status: 500 }
      );
    }

    // --- Fetch buyer and seller names in a batch ---
    const userIds = [
      ...new Set([
        ...(disputes || []).map((d) => d.buyer_id),
        ...(disputes || []).map((d) => d.seller_id),
      ]),
    ].filter(Boolean);

    const { data: profiles } =
      userIds.length > 0
        ? await serviceClient
            .from('user_profiles')
            .select('id, full_name')
            .in('id', userIds)
        : { data: [] };

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p.full_name])
    );

    // Project fields matching the page's Dispute interface
    const disputesWithNames = (disputes || []).map((dispute) => ({
      order_id: dispute.id,
      order_number: dispute.order_number,
      dispute_type: dispute.dispute_status,
      dispute_reason: dispute.dispute_reason,
      game_name: (dispute.order_items as { game_name: string }[])?.[0]?.game_name || 'Unknown game',
      total_amount: dispute.total_amount,
      disputed_at: dispute.disputed_at,
      deadline_at: dispute.dispute_seller_deadline,
      buyer_name: profileMap.get(dispute.buyer_id) || 'Unknown',
      seller_name: profileMap.get(dispute.seller_id) || 'Unknown',
      resolution_type: dispute.dispute_resolution,
      refund_status: dispute.refund_status,
      payment_method: dispute.payment_method,
      status: dispute.status,
    }));

    return NextResponse.json({
      disputes: disputesWithNames,
      counts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch disputes', details: message },
      { status: 500 }
    );
  }
}
