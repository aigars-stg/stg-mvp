import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  shipping_method: string;
  total_amount: number;
  created_at: string | null;
  paid_at: string | null;
  items_total: number;
  shipping_cost: number;
}

interface OrderWithIssueCount extends OrderRow {
  issue_count: {
    total: number;
    open: number;
  };
}

/**
 * GET /api/staff/transactions
 *
 * Staff-only endpoint to list all transactions/orders.
 * Supports filtering by status, searching by order number, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify staff status using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const hasIssues = searchParams.get('has_issues') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build query using serviceClient (staff already verified, bypass RLS)
    let query = serviceClient
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        shipping_method,
        total_amount,
        created_at,
        paid_at,
        items_total,
        shipping_cost,
        platform_commission_cents
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('order_number', `%${search}%`);
    }

    // Date range filtering for bookkeeping
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Order by most recent first
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // If filtering by issues, we need to check which orders have open issues
    let ordersWithIssueInfo: OrderWithIssueCount[] = (orders || []).map((o) => ({
      ...o,
      issue_count: { total: 0, open: 0 },
    }));

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);

      // Get issue counts for these orders
      const { data: issueCounts } = await serviceClient
        .from('order_issues')
        .select('order_id, status')
        .in('order_id', orderIds);

      const issueCountMap = new Map<string, { total: number; open: number }>();
      (issueCounts || []).forEach((issue) => {
        const existing = issueCountMap.get(issue.order_id) || { total: 0, open: 0 };
        existing.total++;
        if (issue.status === 'open' || issue.status === 'investigating') {
          existing.open++;
        }
        issueCountMap.set(issue.order_id, existing);
      });

      ordersWithIssueInfo = orders.map((order) => ({
        ...order,
        issue_count: issueCountMap.get(order.id) || { total: 0, open: 0 },
      }));

      // Filter by has_issues if requested
      if (hasIssues) {
        ordersWithIssueInfo = ordersWithIssueInfo.filter(
          (order) => order.issue_count.open > 0
        );
      }
    }

    // Get buyer and seller names for display
    const userIds = [
      ...new Set([
        ...ordersWithIssueInfo.map((o) => o.buyer_id),
        ...ordersWithIssueInfo.map((o) => o.seller_id),
      ]),
    ];

    const { data: profiles } = userIds.length > 0
      ? await serviceClient
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p.full_name])
    );

    // Attach names to orders
    const ordersWithNames = ordersWithIssueInfo.map((order) => ({
      ...order,
      buyer_name: profileMap.get(order.buyer_id) || 'Unknown',
      seller_name: profileMap.get(order.seller_id) || 'Unknown',
    }));

    return NextResponse.json({
      orders: ordersWithNames,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: message },
      { status: 500 }
    );
  }
}
