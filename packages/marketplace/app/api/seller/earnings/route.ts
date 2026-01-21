import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/earnings
 *
 * Get seller's earnings summary from database
 * Uses the seller_earnings_summary view for aggregated data
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    // Try to get from view first (if available)
    const { data: summaryData, error: summaryError } = await supabase
      .from('seller_earnings_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If view exists and has data
    if (summaryData && !summaryError) {
      return NextResponse.json({
        totalSalesCount: summaryData.total_sales_count || 0,
        totalGross: Number(summaryData.total_gross) || 0,
        totalPlatformFees: Number(summaryData.total_platform_fees) || 0,
        totalNet: Number(summaryData.total_net) || 0,
        completedPayoutsCount: summaryData.completed_payouts_count || 0,
        pendingPayoutsCount: summaryData.pending_payouts_count || 0,
        salesLast30Days: summaryData.sales_last_30_days || 0,
        earningsLast30Days: Number(summaryData.earnings_last_30_days) || 0,
      }, {
        headers: {
          'Cache-Control': 'private, max-age=30',
        },
      });
    }

    // Fallback: Query orders directly if view doesn't exist or returns no data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('items_total, shipping_cost, service_fee, payout_status, updated_at')
      .eq('seller_id', user.id)
      .eq('status', 'completed');

    if (ordersError) {
      throw new Error('Failed to fetch earnings data');
    }

    // Calculate aggregates manually
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalSalesCount = 0;
    let totalGross = 0;
    let totalPlatformFees = 0;
    let completedPayoutsCount = 0;
    let pendingPayoutsCount = 0;
    let salesLast30Days = 0;
    let earningsLast30Days = 0;

    if (orders) {
      for (const order of orders) {
        // Seller earns items_total only (shipping goes to platform via Unisend)
        const sellerEarnings = Number(order.items_total);
        const fee = Number(order.service_fee);
        if (!order.updated_at) continue;
        const orderDate = new Date(order.updated_at);

        totalSalesCount++;
        totalGross += sellerEarnings;
        totalPlatformFees += fee;

        if (order.payout_status === 'completed') {
          completedPayoutsCount++;
        } else if (order.payout_status === 'pending') {
          pendingPayoutsCount++;
        }

        if (orderDate >= thirtyDaysAgo) {
          salesLast30Days++;
          earningsLast30Days += sellerEarnings;
        }
      }
    }

    return NextResponse.json({
      totalSalesCount,
      totalGross,
      totalPlatformFees,
      totalNet: totalGross, // Seller gets full amount
      completedPayoutsCount,
      pendingPayoutsCount,
      salesLast30Days,
      earningsLast30Days,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Fetch earnings');
  }
}
