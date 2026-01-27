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

    // Check admin role
    const { data: userProfile } = await adminSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
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
      .select('id, order_number, status, dispute_status, buyer_id, seller_id')
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

    // Determine final order status based on resolution
    const finalOrderStatus =
      resolution_type === 'seller_favor' ? 'completed' : 'refunded';

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

    console.log(
      `⚖️ [Dispute] Resolved order ${order.order_number}: ${resolution_type} by admin ${user.id}`
    );

    // TODO: Process refund if buyer_full_refund or buyer_partial_refund
    // TODO: Send resolution emails to buyer and seller

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      resolution: resolution_type,
      finalStatus: finalOrderStatus,
    });
  } catch (error) {
    return handleApiError(error, 'Resolve dispute');
  }
}
