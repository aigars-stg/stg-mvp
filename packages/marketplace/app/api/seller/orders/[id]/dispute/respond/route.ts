import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { formatPrice } from '@/lib/services/pricing';
import { createServiceClient } from '@/lib/supabase/client';

const adminSupabase = createServiceClient();

interface Params {
  params: Promise<{ id: string }>;
}

interface RespondBody {
  response_text: string;
  photo_urls?: string[];
  accept_claim?: boolean;
}

/**
 * POST /api/seller/orders/[id]/dispute/respond
 *
 * Submit seller's response to a buyer dispute.
 * - Seller must own the order
 * - Order must be disputed with dispute_status = 'awaiting_seller'
 * - Must be within 48h deadline
 * - Can only respond once
 * - Response text min 50 chars, max 2000
 * - Optional photos (up to 5 URLs)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const { id: orderId } = await params;
    const body: RespondBody = await request.json();
    const { response_text, photo_urls, accept_claim } = body;

    // Validate response text (required even when accepting, to acknowledge)
    if (!accept_claim && (!response_text || response_text.trim().length < 50)) {
      return NextResponse.json(
        { error: 'Response must be at least 50 characters' },
        { status: 400 }
      );
    }

    if (response_text.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Response must be under 2000 characters' },
        { status: 400 }
      );
    }

    // Validate photos
    if (photo_urls && photo_urls.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 photos allowed' },
        { status: 400 }
      );
    }

    // Get order
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select(`
        id,
        order_number,
        seller_id,
        buyer_id,
        status,
        dispute_status,
        dispute_reason,
        dispute_seller_responded_at,
        dispute_seller_deadline,
        total_amount
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify seller owns this order
    if (order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check order is disputed
    if (order.status !== 'disputed') {
      return NextResponse.json(
        { error: 'This order does not have an active dispute' },
        { status: 400 }
      );
    }

    // Check dispute is awaiting seller
    if (order.dispute_status !== 'awaiting_seller') {
      return NextResponse.json(
        { error: 'This dispute is no longer awaiting your response' },
        { status: 400 }
      );
    }

    // Check not already responded
    if (order.dispute_seller_responded_at) {
      return NextResponse.json(
        { error: 'You have already responded to this dispute' },
        { status: 400 }
      );
    }

    // Check within deadline
    if (order.dispute_seller_deadline) {
      const deadline = new Date(order.dispute_seller_deadline);
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: 'The response deadline has passed' },
          { status: 400 }
        );
      }
    }

    // Save response
    const now = new Date().toISOString();

    if (accept_claim) {
      // Seller accepts buyer's claim — record response first, then process refund
      const { error: responseError } = await adminSupabase
        .from('orders')
        .update({
          dispute_seller_response: (response_text || 'Seller accepted the claim.').trim(),
          dispute_seller_photo_urls: photo_urls || [],
          dispute_seller_responded_at: now,
          dispute_resolution: 'buyer_full_refund',
          updated_at: now,
        })
        .eq('id', orderId);

      if (responseError) {
        console.error('Failed to save dispute acceptance:', responseError);
        return NextResponse.json(
          { error: 'Failed to submit response' },
          { status: 500 }
        );
      }

      // Process refund before marking as resolved
      let refundSuccess = false;
      try {
        const { processRefund, createRefundAdapter } = await import('@/lib/services/refund');
        const result = await processRefund(adminSupabase, orderId, createRefundAdapter());
        refundSuccess = result.success;
        if (!result.success) {
          console.error(`Refund failed for auto-resolved dispute on order ${order.order_number}:`, result.error);
        }
      } catch (refundError) {
        console.error(`Refund failed for auto-resolved dispute on order ${order.order_number}:`, refundError);
      }

      // Update final status based on refund outcome
      const resolvedAt = now;
      await adminSupabase
        .from('orders')
        .update({
          dispute_status: 'resolved',
          dispute_resolved_at: resolvedAt,
          status: refundSuccess ? 'refunded' : 'disputed',
          updated_at: resolvedAt,
        })
        .eq('id', orderId);

      // Close corresponding order_issues
      await adminSupabase
        .from('order_issues')
        .update({ status: 'resolved', resolved_at: resolvedAt })
        .eq('order_id', orderId)
        .in('status', ['open', 'investigating']);

      // Notify buyer that seller accepted (async, don't block)
      try {
        const { sendDisputeSellerAccepted } = await import('@/lib/email/send-order-emails');
        const { data: buyerProfile } = await adminSupabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', order.buyer_id)
          .single();

        if (buyerProfile?.email) {
          sendDisputeSellerAccepted({
            buyerName: buyerProfile.full_name || 'Buyer',
            buyerEmail: buyerProfile.email,
            orderNumber: order.order_number,
            orderId: order.id,
            refundAmount: formatPrice(order.total_amount || 0),
          });
        }
      } catch (emailError) {
        console.error('Failed to send dispute accepted email:', emailError);
      }

      console.log(`[Dispute] Seller accepted claim on order ${order.order_number} — auto-resolved (refund ${refundSuccess ? 'succeeded' : 'failed'})`);

      return NextResponse.json({
        success: true,
        orderNumber: order.order_number,
        disputeStatus: 'resolved',
        autoResolved: true,
        refundProcessed: refundSuccess,
        message: refundSuccess
          ? 'You accepted the claim. A refund will be processed for the buyer.'
          : 'You accepted the claim. The refund could not be processed automatically — our team will handle it.',
      });
    }

    // Seller contests — escalate to admin review
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        dispute_seller_response: response_text.trim(),
        dispute_seller_photo_urls: photo_urls || [],
        dispute_seller_responded_at: now,
        dispute_status: 'under_review',
        updated_at: now,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to save dispute response:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit response' },
        { status: 500 }
      );
    }

    // Notify buyer that seller responded + notify staff of escalation
    try {
      const { sendDisputeSellerResponse, sendDisputeEscalatedToStaff } = await import('@/lib/email/send-order-emails');
      const [{ data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
        adminSupabase.from('user_profiles').select('full_name, email').eq('id', order.buyer_id).single(),
        adminSupabase.from('user_profiles').select('full_name').eq('id', order.seller_id).single(),
      ]);

      if (buyerProfile?.email) {
        sendDisputeSellerResponse({
          buyerName: buyerProfile.full_name || 'Buyer',
          buyerEmail: buyerProfile.email,
          orderNumber: order.order_number,
          orderId: order.id,
        });
      }

      // Staff notification
      sendDisputeEscalatedToStaff({
        orderNumber: order.order_number,
        orderId: order.id,
        reason: order.dispute_reason || 'Unknown',
        buyerName: buyerProfile?.full_name || 'Unknown',
        sellerName: sellerProfile?.full_name || 'Unknown',
        totalAmountEuros: (order.total_amount || 0).toFixed(2),
        escalationReason: 'seller_contested',
      });
    } catch (emailError) {
      console.error('Failed to send dispute response emails:', emailError);
    }

    console.log(`[Dispute] Seller responded to dispute on order ${order.order_number}`);

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      disputeStatus: 'under_review',
      message: 'Your response has been submitted. Our team will review the dispute.',
    });
  } catch (error) {
    return handleApiError(error, 'Seller dispute response');
  }
}
