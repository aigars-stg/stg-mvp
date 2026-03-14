import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import { completeWithdrawal } from '@/lib/services/withdrawal';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import { formatDate } from '@/lib/date-utils';
import {
  sendWithdrawalCompletedToSeller,
  sendWithdrawalRejectedToSeller,
  maskIban,
} from '@/lib/email/send-withdrawal-emails';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/withdrawals
 * List withdrawal requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

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
    const { response, user, serviceClient } = await requireStaffAuth();
    if (response) return response;

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

      // Fetch withdrawal details before completing (needed for notification)
      const { data: withdrawal } = await serviceClient
        .from('withdrawal_requests')
        .select('user_id, amount_cents, iban')
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .single();

      const result = await completeWithdrawal(serviceClient, withdrawalId, user.id, bankReference);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to complete withdrawal' },
          { status: 500 }
        );
      }

      // Notify seller via email and in-app notification (fire-and-forget)
      if (withdrawal) {
        const amountEuros = formatCentsToCurrency(withdrawal.amount_cents);
        const processedDate = formatDate(new Date());

        // Look up seller profile for email
        const { data: sellerProfile } = await serviceClient
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', withdrawal.user_id)
          .single();

        if (sellerProfile?.email) {
          sendWithdrawalCompletedToSeller({
            sellerName: sellerProfile.full_name || 'Seller',
            sellerEmail: sellerProfile.email,
            amountEuros,
            maskedIban: maskIban(withdrawal.iban),
            bankReference,
            processedDate,
          }).catch((err) => console.error('[Withdrawal completed email] Failed:', err));
        }

        // In-app notification
        serviceClient.rpc('create_notification', {
          p_user_id: withdrawal.user_id,
          p_type: 'withdrawal_completed',
          p_title: `Withdrawal of ${amountEuros} processed`,
          p_body: `Your funds have been sent to your bank account (${maskIban(withdrawal.iban)}). Please allow 1-2 business days.`,
          p_data: {
            withdrawal_id: withdrawalId,
            amount_cents: withdrawal.amount_cents,
            bank_reference: bankReference,
          },
        }).then(({ error: notifErr }) => {
          if (notifErr) console.error('[Withdrawal completed notification] Failed:', notifErr);
        });
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

      // Fetch withdrawal details before rejecting (needed for notification)
      const { data: rejectedWithdrawal } = await serviceClient
        .from('withdrawal_requests')
        .select('user_id, amount_cents')
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .single();

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

      // Notify seller via email and in-app notification (fire-and-forget)
      if (rejectedWithdrawal) {
        const amountEuros = formatCentsToCurrency(rejectedWithdrawal.amount_cents);

        const { data: sellerProfile } = await serviceClient
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', rejectedWithdrawal.user_id)
          .single();

        if (sellerProfile?.email) {
          sendWithdrawalRejectedToSeller({
            sellerName: sellerProfile.full_name || 'Seller',
            sellerEmail: sellerProfile.email,
            amountEuros,
            rejectionReason,
          }).catch((err) => console.error('[Withdrawal rejected email] Failed:', err));
        }

        // In-app notification
        serviceClient.rpc('create_notification', {
          p_user_id: rejectedWithdrawal.user_id,
          p_type: 'withdrawal_rejected',
          p_title: `Withdrawal of ${amountEuros} not processed`,
          p_body: `Reason: ${rejectionReason}. The funds have been returned to your wallet.`,
          p_data: {
            withdrawal_id: withdrawalId,
            amount_cents: rejectedWithdrawal.amount_cents,
            rejection_reason: rejectionReason,
          },
        }).then(({ error: notifErr }) => {
          if (notifErr) console.error('[Withdrawal rejected notification] Failed:', notifErr);
        });
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
