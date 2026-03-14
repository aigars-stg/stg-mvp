import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { createServiceClient } from '@/lib/supabase/client';
import { processRefund, createRefundAdapter, isRefundableStatus, sendBuyerRefundEmail } from '@/lib/services/refund';
import { loggers } from '@/lib/logger';
import { z } from 'zod';

const refundBodySchema = z.object({
  reason: z.string().min(1, 'Refund reason is required').max(500),
});

const log = loggers.payments;

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/refund
 *
 * Issue a full refund for an order.
 * Accessible by buyer, seller, or staff.
 * Uses shared processRefund service for consistent refund handling.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const { id: orderId } = await params;
    const parsed = refundBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }
    const { reason } = parsed.data;

    const serviceClient = createServiceClient();

    // Get order details for authorization check
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('id, order_number, buyer_id, seller_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user is buyer, seller, or staff
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.is_staff === true;
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isStaff && !isBuyer && !isSeller) {
      return NextResponse.json({ error: 'You are not authorized to refund this order' }, { status: 403 });
    }

    // Check if order is in a refundable status
    if (!isRefundableStatus(order.status)) {
      return NextResponse.json(
        { error: `Order cannot be refunded (status: ${order.status})` },
        { status: 400 }
      );
    }

    log.info({ orderNumber: order.order_number, reason }, 'Processing refund');

    // Set refund reason before processing
    await serviceClient
      .from('orders')
      .update({ refund_reason: reason })
      .eq('id', orderId);

    // Process refund using shared service
    const refundResult = await processRefund(serviceClient, orderId, createRefundAdapter());

    if (!refundResult.success) {
      log.error({ orderId, error: refundResult.error }, 'Refund failed');
      return NextResponse.json({ error: refundResult.error }, { status: 500 });
    }

    log.info({
      orderNumber: order.order_number,
      walletRefundedCents: refundResult.walletRefundedCents,
      everypayRefundedCents: refundResult.everypayRefundedCents,
      refundMethod: refundResult.refundMethod,
    }, 'Refund processed');

    // Send refund confirmation email to buyer (non-blocking)
    sendBuyerRefundEmail(serviceClient, orderId, refundResult);

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      refundMethod: refundResult.refundMethod,
      walletRefundedCents: refundResult.walletRefundedCents,
      everypayRefundedCents: refundResult.everypayRefundedCents,
      requiresManualSepa: refundResult.requiresManualSepa,
    });
  } catch (error) {
    return handleApiError(error, 'Process refund');
  }
}
