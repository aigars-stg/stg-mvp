import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { processRefund, processPartialRefund, confirmSepaRefund, createRefundAdapter } from '@/lib/services/refund';

interface RefundBody {
  order_id: string;
  refund_type: 'full' | 'partial' | 'confirm_sepa';
  refund_amount_cents?: number;
  sepa_reference?: string;
}

/**
 * POST /api/admin/refund
 *
 * Staff-only endpoint for processing refunds outside of dispute resolution.
 * Also handles SEPA confirmation for bank link payments.
 */
export async function POST(request: NextRequest) {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    const body: RefundBody = await request.json();
    const { order_id, refund_type, refund_amount_cents, sepa_reference } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Handle SEPA confirmation
    if (refund_type === 'confirm_sepa') {
      if (!sepa_reference || sepa_reference.trim().length === 0) {
        return NextResponse.json({ error: 'SEPA reference is required' }, { status: 400 });
      }

      const result = await confirmSepaRefund(serviceClient, order_id, sepa_reference.trim());
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'SEPA refund confirmed' });
    }

    if (refund_type === 'full') {
      const result = await processRefund(serviceClient, order_id, createRefundAdapter());
      return NextResponse.json({
        success: result.success,
        walletRefundedCents: result.walletRefundedCents,
        everypayRefundedCents: result.everypayRefundedCents,
        refundMethod: result.refundMethod,
        requiresManualSepa: result.requiresManualSepa,
        error: result.error,
      });
    }

    if (refund_type === 'partial') {
      if (!refund_amount_cents || refund_amount_cents <= 0) {
        return NextResponse.json({ error: 'Valid refund_amount_cents is required for partial refunds' }, { status: 400 });
      }

      const result = await processPartialRefund(serviceClient, order_id, refund_amount_cents, createRefundAdapter());
      return NextResponse.json({
        success: result.success,
        walletRefundedCents: result.walletRefundedCents,
        everypayRefundedCents: result.everypayRefundedCents,
        refundMethod: result.refundMethod,
        requiresManualSepa: result.requiresManualSepa,
        error: result.error,
      });
    }

    return NextResponse.json({ error: 'Invalid refund_type' }, { status: 400 });
  } catch (error) {
    return handleApiError(error, 'Admin refund');
  }
}
