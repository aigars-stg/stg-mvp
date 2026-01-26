import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { DISPUTE_WINDOW_DAYS } from '@/lib/pricing/constants';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Params {
  params: Promise<{ id: string }>;
}

interface DisputeBody {
  reason: string;
  description: string;
}

/**
 * POST /api/orders/[id]/dispute
 *
 * Open a dispute for an order.
 * Only the buyer can open a dispute, and only within the dispute window (2 days after delivery).
 *
 * Requirements:
 * - Order must be in 'delivered' status
 * - Must be within 2 days of delivery timestamp
 * - Only buyer can open dispute
 * - Updates status to 'disputed'
 * - Blocks auto-complete and payout
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const { id: orderId } = await params;
    const body: DisputeBody = await request.json();
    const { reason, description } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Dispute reason is required' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed description (at least 10 characters)' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        delivered_at,
        updated_at
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only buyer can open dispute
    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the buyer can open a dispute' },
        { status: 403 }
      );
    }

    // Check if order is in delivered status
    if (order.status !== 'delivered') {
      if (order.status === 'completed') {
        return NextResponse.json(
          { error: 'Dispute window has closed - order has been completed' },
          { status: 400 }
        );
      }
      if (order.status === 'disputed') {
        return NextResponse.json(
          { error: 'This order already has an open dispute' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Cannot dispute order in status: ${order.status}` },
        { status: 400 }
      );
    }

    // Check if within dispute window (2 days after delivery)
    const deliveryTimestamp = order.delivered_at || order.updated_at;
    const deliveryDate = new Date(deliveryTimestamp);
    const disputeDeadline = new Date(deliveryDate.getTime() + DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now > disputeDeadline) {
      return NextResponse.json(
        {
          error: `Dispute window has closed. You had ${DISPUTE_WINDOW_DAYS} days after delivery to open a dispute.`,
          disputeDeadline: disputeDeadline.toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`⚠️ [Dispute] Opening dispute for order ${order.order_number}`);
    console.log(`⚠️ [Dispute] Reason: ${reason}`);

    // Update order to disputed status
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'disputed',
        disputed_at: new Date().toISOString(),
        dispute_reason: reason,
        dispute_description: description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ [Dispute] Failed to update order:', updateError);
      return NextResponse.json(
        { error: 'Failed to open dispute' },
        { status: 500 }
      );
    }

    // Get seller email to notify them
    const { data: sellerProfile } = await adminSupabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', order.seller_id)
      .single();

    // Send notification email to seller (async, don't block response)
    if (sellerProfile?.email) {
      // TODO: Implement dispute notification email
      console.log(`📧 [Dispute] Should notify seller: ${sellerProfile.email}`);
    }

    console.log(`✅ [Dispute] Dispute opened for order ${order.order_number}`);

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      status: 'disputed',
      message: 'Dispute opened. Our support team will review and contact both parties.',
    });
  } catch (error) {
    return handleApiError(error, 'Open dispute');
  }
}

/**
 * GET /api/orders/[id]/dispute
 *
 * Get dispute status and details for an order.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const { id: orderId } = await params;

    // Get order details
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        delivered_at,
        updated_at,
        disputed_at,
        dispute_reason,
        dispute_description,
        dispute_resolved_at,
        dispute_resolution
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only buyer or seller can view dispute details
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this order' },
        { status: 403 }
      );
    }

    // Calculate dispute window info
    const deliveryTimestamp = order.delivered_at || order.updated_at;
    const deliveryDate = new Date(deliveryTimestamp);
    const disputeDeadline = new Date(deliveryDate.getTime() + DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const canDispute = order.status === 'delivered' && now <= disputeDeadline;

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      hasDispute: order.status === 'disputed',
      canDispute,
      disputeDeadline: disputeDeadline.toISOString(),
      dispute: order.status === 'disputed' ? {
        openedAt: order.disputed_at,
        reason: order.dispute_reason,
        description: order.dispute_description,
        resolvedAt: order.dispute_resolved_at,
        resolution: order.dispute_resolution,
      } : null,
    });
  } catch (error) {
    return handleApiError(error, 'Get dispute status');
  }
}
