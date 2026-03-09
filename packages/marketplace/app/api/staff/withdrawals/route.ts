import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import { completeWithdrawal } from '@/lib/services/withdrawal';

export const dynamic = 'force-dynamic';

/**
 * Verify staff access. Returns user or error response.
 */
async function requireStaff() {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .select('is_staff')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_staff) {
    return { error: NextResponse.json({ error: 'Staff access required' }, { status: 403 }) };
  }

  return { user, serviceClient };
}

/**
 * GET /api/staff/withdrawals
 * List withdrawal requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;
    const { serviceClient } = auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let query = serviceClient
      .from('withdrawal_requests')
      .select('*', { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: status === 'pending' })
      .range(offset, offset + limit - 1);

    const { data: withdrawals, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }

    // Get seller names
    const userIds = [...new Set((withdrawals || []).map((w) => w.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await serviceClient
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, { name: p.full_name, email: p.email }])
    );

    const enriched = (withdrawals || []).map((w) => ({
      id: w.id,
      userId: w.user_id,
      amountCents: w.amount_cents,
      iban: w.iban,
      accountHolderName: w.account_holder_name,
      status: w.status,
      bankReference: w.bank_reference,
      rejectionReason: w.rejection_reason,
      createdAt: w.created_at,
      processedAt: w.processed_at,
      sellerName: profileMap.get(w.user_id)?.name || 'Unknown',
      sellerEmail: profileMap.get(w.user_id)?.email || '',
    }));

    // Summary stats for pending
    let pendingCount = 0;
    let pendingTotalCents = 0;
    if (status === 'pending' || status === 'all') {
      const { data: pendingStats } = await serviceClient
        .from('withdrawal_requests')
        .select('amount_cents')
        .eq('status', 'pending');

      if (pendingStats) {
        pendingCount = pendingStats.length;
        pendingTotalCents = pendingStats.reduce((sum, w) => sum + w.amount_cents, 0);
      }
    }

    return NextResponse.json({
      withdrawals: enriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        pendingCount,
        pendingTotalCents,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch withdrawals', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff/withdrawals
 * Process a withdrawal: complete or reject
 * Body: { withdrawalId, action: 'complete' | 'reject', bankReference?, rejectionReason? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;
    const { user, serviceClient } = auth;

    const body = await request.json();
    const { withdrawalId, action, bankReference, rejectionReason } = body;

    if (!withdrawalId || !action) {
      return NextResponse.json(
        { error: 'withdrawalId and action are required' },
        { status: 400 }
      );
    }

    if (action === 'complete') {
      if (!bankReference) {
        return NextResponse.json(
          { error: 'Bank reference is required to complete a withdrawal' },
          { status: 400 }
        );
      }

      const result = await completeWithdrawal(serviceClient, withdrawalId, user.id, bankReference);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to complete withdrawal' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'completed',
        documentNumber: result.documentNumber,
      });
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      // Reject and refund the wallet
      const { data, error } = await serviceClient.rpc('reject_withdrawal_request', {
        p_withdrawal_id: withdrawalId,
        p_processed_by: user.id,
        p_reason: rejectionReason,
      });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to reject withdrawal' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: 'rejected', data });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "complete" or "reject"' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process withdrawal', details: message },
      { status: 500 }
    );
  }
}
