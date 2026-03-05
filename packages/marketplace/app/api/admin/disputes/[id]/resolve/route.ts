import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { processRefund, processPartialRefund, createRefundAdapter } from '@/lib/services/refund';
import { sendDisputeResolved, sendRefundCompleted } from '@/lib/email/send-order-emails';
import { creditSellerWallet } from '@/lib/services/wallet';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import { createServiceClient } from '@/lib/supabase/client';

const adminSupabase = createServiceClient();

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_RESOLUTION_TYPES = [
  'buyer_full_refund',
  'buyer_partial_refund',
  'seller_favor',
  'mutual_agreement',
] as const;

type ResolutionType = (typeof VALID_RESOLUTION_TYPES)[number];

interface ResolveBody {
  resolution_type: ResolutionType;
  resolution_notes: string;
  refund_amount_cents?: number;
}

/**
 * POST /api/admin/disputes/[id]/resolve
 *
 * Staff endpoint to resolve a dispute.
 * Requires admin role. Updates order dispute_status to 'resolved'.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    // Check staff role
    const { data: userProfile } = await adminSupabase
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (!userProfile?.is_staff) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id: orderId } = await params;
    const body: ResolveBody = await request.json();
    const { resolution_type, resolution_notes, refund_amount_cents } = body;

    // Validate
    if (!VALID_RESOLUTION_TYPES.includes(resolution_type)) {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      );
    }

    if (!resolution_notes || resolution_notes.trim().length < 10) {
      return NextResponse.json(
        { error: 'Resolution notes must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (resolution_type === 'buyer_partial_refund' && !refund_amount_cents) {
      return NextResponse.json(
        { error: 'Refund amount is required for partial refunds' },
        { status: 400 }
      );
    }

    // Get order
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('id, order_number, status, dispute_status, buyer_id, seller_id, total_amount, buyer_wallet_debit_cents, everypay_payment_reference, payment_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'disputed') {
      return NextResponse.json(
        { error: 'Order is not in disputed status' },
        { status: 400 }
      );
    }

    // Allow resolution from under_review or awaiting_seller (admin override)
    if (order.dispute_status !== 'under_review' && order.dispute_status !== 'awaiting_seller') {
      return NextResponse.json(
        { error: 'Dispute is not awaiting resolution' },
        { status: 400 }
      );
    }

    // Determine final order status based on resolution
    const finalOrderStatus =
      resolution_type === 'seller_favor' || resolution_type === 'mutual_agreement'
        ? 'completed'
        : 'refunded';

    const now = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        dispute_status: 'resolved',
        dispute_resolution: resolution_type,
        dispute_resolution_note: resolution_notes.trim(),
        dispute_resolved_at: now,
        dispute_resolved_by: user.id,
        status: finalOrderStatus,
        updated_at: now,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to resolve dispute:', updateError);
      return NextResponse.json(
        { error: 'Failed to resolve dispute' },
        { status: 500 }
      );
    }

    // Close corresponding order_issues
    await adminSupabase
      .from('order_issues')
      .update({ status: 'resolved', resolved_at: now })
      .eq('order_id', orderId)
      .in('status', ['open', 'investigating']);

    console.log(
      `[Dispute] Resolved order ${order.order_number}: ${resolution_type} by admin ${user.id}`
    );

    // Process refund if applicable
    let refundResult;
    if (resolution_type === 'buyer_full_refund') {
      refundResult = await processRefund(adminSupabase, orderId, createRefundAdapter());
      if (!refundResult.success) {
        console.error(`Refund failed for order ${order.order_number}:`, refundResult.error);
      }
    } else if (resolution_type === 'buyer_partial_refund' && refund_amount_cents) {
      refundResult = await processPartialRefund(adminSupabase, orderId, refund_amount_cents, createRefundAdapter());
      if (!refundResult.success) {
        console.error(`Partial refund failed for order ${order.order_number}:`, refundResult.error);
      }
    } else if (resolution_type === 'seller_favor' || resolution_type === 'mutual_agreement') {
      // Credit seller wallet since order is completed in seller's favor
      const walletResult = await creditSellerWallet(adminSupabase, orderId);
      if (!walletResult.success) {
        console.error(`Seller wallet credit failed for order ${order.order_number}:`, walletResult.error);
      }
    }

    // Send resolution emails to buyer and seller
    const { data: profiles } = await adminSupabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', [order.buyer_id, order.seller_id]);

    if (profiles) {
      const isSellerFavor = resolution_type === 'seller_favor' || resolution_type === 'mutual_agreement';
      for (const profile of profiles) {
        sendDisputeResolved({
          recipientName: profile.full_name || 'User',
          recipientEmail: profile.email,
          orderNumber: order.order_number,
          resolution: resolution_type,
          resolutionNote: resolution_notes.trim(),
          isSellerFavor,
        }).catch(err => console.error('Dispute email failed:', err));
      }

      // Send refund confirmation to buyer if refund was processed
      if (refundResult?.success) {
        const buyerProfile = profiles.find(p => p.id === order.buyer_id);
        if (buyerProfile?.email) {
          const refundMethodMap: Record<string, 'card' | 'bank' | 'wallet'> = {
            everypay_card: 'card',
            everypay_bank_link: 'bank',
            wallet_only: 'wallet',
            mixed: 'wallet',
          };
          const totalRefundCents = (refundResult.walletRefundedCents || 0) + (refundResult.everypayRefundedCents || 0);
          sendRefundCompleted({
            buyerName: buyerProfile.full_name || 'Buyer',
            buyerEmail: buyerProfile.email,
            orderNumber: order.order_number,
            refundAmount: formatCentsToCurrency(totalRefundCents),
            refundMethod: refundMethodMap[refundResult.refundMethod || ''] || 'card',
          }).catch(err => console.error('Refund email failed:', err));
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      resolution: resolution_type,
      finalStatus: finalOrderStatus,
      requiresManualSepa: refundResult?.requiresManualSepa || false,
    });
  } catch (error) {
    return handleApiError(error, 'Resolve dispute');
  }
}
