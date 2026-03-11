import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/orders/active-count
 *
 * Lightweight endpoint for polling active order count.
 * Seller count: pending_seller + disputed (action needed)
 * Buyer count: pending_seller + accepted + shipped + delivered (in flight)
 */
export async function GET() {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const [{ count: sellerCount }, { count: buyerCount }] = await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .in('status', ['pending_seller', 'disputed']),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
        .in('status', ['pending_seller', 'accepted', 'shipped', 'delivered']),
    ]);

    return NextResponse.json({ count: (sellerCount || 0) + (buyerCount || 0) });
  } catch (error) {
    return handleApiError(error, 'Get active order count');
  }
}
