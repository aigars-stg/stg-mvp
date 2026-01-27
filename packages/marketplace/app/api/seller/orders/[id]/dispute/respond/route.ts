import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Params {
  params: Promise<{ id: string }>;
}

interface RespondBody {
  response_text: string;
  photo_urls?: string[];
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
    const { response_text, photo_urls } = body;

    // Validate response text
    if (!response_text || response_text.trim().length < 50) {
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
        dispute_seller_responded_at,
        dispute_seller_deadline
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
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({
        dispute_seller_response: response_text.trim(),
        dispute_photo_urls: photo_urls || [],
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

    console.log(`📝 [Dispute] Seller responded to dispute on order ${order.order_number}`);

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
