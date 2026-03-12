import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { processRefund, processPartialRefund, processPostCompletionRefund, processPostCompletionPartialRefund, createRefundAdapter } from '@/lib/services/refund';
import { sendDisputeResolved, sendRefundCompleted } from '@/lib/email/send-order-emails';
import { creditSellerWallet } from '@/lib/services/wallet';
import { formatCentsToCurrency } from '@/lib/services/pricing';

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
    const { response, user, serviceClient } = await requireStaffAuth();
    if (response) return response;

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
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('id, order_number, status, dispute_status, buyer_id, seller_id, total_amount, buyer_wallet_debit_cents, everypay_payment_reference, payment_method, wallet_credited_at')
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
    const { error: updateError } = await serviceClient
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
    await serviceClient
      .from('order_issues')
      .update({ status: 'resolved', resolved_at: now })
      .eq('order_id', orderId)
      .in('status', ['open', 'investigating']);

    console.log(
      `[Dispute] Resolved order ${order.order_number}: ${resolution_type} by admin ${user.id}`
    );

    // Process refund if applicable
    let refundResult;
    let postCompletionResult;
    if (resolution_type === 'buyer_full_refund') {
      if (order.wallet_credited_at) {
        // Post-completion: claw back seller wallet, refund buyer, generate credit note
        postCompletionResult = await processPostCompletionRefund(
          serviceClient, orderId, resolution_notes.trim(), createRefundAdapter(),
        );
        if (!postCompletionResult.success) {
          console.error(`Post-completion refund failed for order ${order.order_number}:`, postCompletionResult.error);
        } else {
          // Map to refundResult shape for email sending below
          refundResult = {
            success: true,
            walletRefundedCents: postCompletionResult.buyerRefundResult?.walletRefundedCents,
            everypayRefundedCents: postCompletionResult.buyerRefundResult?.everypayRefundedCents,
            requiresManualSepa: postCompletionResult.buyerRefundResult?.requiresManualSepa,
            refundMethod: postCompletionResult.buyerRefundResult?.requiresManualSepa ? 'everypay_bank_link' : undefined,
          };
        }
      } else {
        // Pre-completion: standard refund (no wallet clawback needed)
        refundResult = await processRefund(serviceClient, orderId, createRefundAdapter());
        if (!refundResult.success) {
          console.error(`Refund failed for order ${order.order_number}:`, refundResult.error);
        }
      }
    } else if (resolution_type === 'buyer_partial_refund' && refund_amount_cents) {
      if (order.wallet_credited_at) {
        // Post-completion: proportional clawback from seller wallet + refund buyer
        postCompletionResult = await processPostCompletionPartialRefund(
          serviceClient, orderId, refund_amount_cents, resolution_notes.trim(), createRefundAdapter(),
        );
        if (!postCompletionResult.success) {
          console.error(`Post-completion partial refund failed for order ${order.order_number}:`, postCompletionResult.error);
        } else {
          refundResult = {
            success: true,
            walletRefundedCents: postCompletionResult.buyerRefundResult?.walletRefundedCents,
            everypayRefundedCents: postCompletionResult.buyerRefundResult?.everypayRefundedCents,
            requiresManualSepa: postCompletionResult.buyerRefundResult?.requiresManualSepa,
            refundMethod: postCompletionResult.buyerRefundResult?.requiresManualSepa ? 'everypay_bank_link' : undefined,
          };
        }
      } else {
        // Pre-completion: standard partial refund (no wallet clawback needed)
        refundResult = await processPartialRefund(serviceClient, orderId, refund_amount_cents, createRefundAdapter());
        if (!refundResult.success) {
          console.error(`Partial refund failed for order ${order.order_number}:`, refundResult.error);
        }
      }
    } else if (resolution_type === 'seller_favor' || resolution_type === 'mutual_agreement') {
      if (!order.wallet_credited_at) {
        // Pre-completion dispute resolved in seller's favor: credit wallet now
        const walletResult = await creditSellerWallet(serviceClient, orderId);
        if (!walletResult.success) {
          console.error(`Seller wallet credit failed for order ${order.order_number}:`, walletResult.error);
        }
      }
      // Post-completion seller_favor: wallet already credited, nothing to do
    }

    // Send resolution emails to buyer and seller
    const { data: profiles } = await serviceClient
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
      requiresManualSepa: refundResult?.requiresManualSepa || postCompletionResult?.buyerRefundResult?.requiresManualSepa || false,
      creditNoteNumber: postCompletionResult?.creditNoteNumber,
    });
  } catch (error) {
    return handleApiError(error, 'Resolve dispute');
  }
}
