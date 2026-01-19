import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { getTrackingUrl } from '@/lib/unisend/label-service';

// Service role client for bypassing RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SimulationAction =
  | 'label_printed'      // Seller printed label at terminal (assigns barcode)
  | 'shipped'            // Parcel dropped at sender terminal
  | 'in_transit'         // Parcel in transit between terminals
  | 'delivered'          // Buyer picked up parcel at destination terminal
  | 'set_barcode';       // Manually set a barcode

interface SimulateShippingBody {
  action: SimulationAction;
  barcode?: string;      // For 'set_barcode' or 'label_printed' action
}

// Generate a realistic-looking test barcode
function generateTestBarcode(): string {
  const prefix = 'CH'; // Standard prefix for parcels
  const random = Math.floor(Math.random() * 900000000) + 100000000; // 9 digits
  return `${prefix}${random}LT`;
}

/**
 * POST /api/staff/orders/[id]/simulate-shipping
 *
 * Staff-only endpoint to simulate shipping events for testing.
 * Only works in non-production environments.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check environment - only allow in development/staging
    const isProduction = process.env.NODE_ENV === 'production' &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('staging');

    if (isProduction) {
      return NextResponse.json(
        { error: 'Simulation not available in production' },
        { status: 403 }
      );
    }

    const { response, user, supabase: userSupabase } = await requireAuth();
    if (response) return response;

    // Verify user is staff
    const { data: profile } = await userSupabase
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (!profile?.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    const orderId = params.id;
    const body: SimulateShippingBody = await request.json();
    const { action, barcode: providedBarcode } = body;

    // Fetch current order state
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, shipping_method, unisend_parcel_id, barcode, tracking_url')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate order is T2T
    if (order.shipping_method !== 't2t') {
      return NextResponse.json(
        { error: 'Simulation only available for T2T orders' },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown> = {};
    let message = '';

    switch (action) {
      case 'set_barcode':
      case 'label_printed': {
        // Simulate barcode being assigned when seller prints at terminal
        const newBarcode = providedBarcode || generateTestBarcode();
        const trackingUrl = getTrackingUrl(newBarcode);

        updateData = {
          barcode: newBarcode,
          tracking_url: trackingUrl,
        };
        message = `Barcode assigned: ${newBarcode}. Tracking URL: ${trackingUrl}`;
        break;
      }

      case 'shipped': {
        // Simulate parcel being dropped at sender terminal
        if (order.status !== 'accepted') {
          return NextResponse.json(
            { error: 'Order must be in "accepted" status to mark as shipped' },
            { status: 400 }
          );
        }

        // If no barcode yet, assign one
        let barcode = order.barcode;
        if (!barcode) {
          barcode = providedBarcode || generateTestBarcode();
          updateData.barcode = barcode;
          updateData.tracking_url = getTrackingUrl(barcode);
        }

        updateData.status = 'shipped';
        message = `Order marked as shipped. Barcode: ${barcode}`;
        break;
      }

      case 'in_transit': {
        // Simulate parcel being in transit
        if (!['accepted', 'shipped'].includes(order.status)) {
          return NextResponse.json(
            { error: 'Order must be in "accepted" or "shipped" status' },
            { status: 400 }
          );
        }

        updateData.status = 'in_transit';
        message = 'Order marked as in transit';
        break;
      }

      case 'delivered': {
        // Simulate buyer picking up the parcel (includes arrival at terminal)
        if (!['shipped', 'in_transit'].includes(order.status)) {
          return NextResponse.json(
            { error: 'Order must be shipped or in_transit to mark as delivered' },
            { status: 400 }
          );
        }

        updateData.status = 'delivered';
        message = 'Order marked as delivered (buyer picked up at terminal)';
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Apply the update
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('[Simulate Shipping] Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      action,
      message,
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    return handleApiError(error, 'Simulate shipping');
  }
}

/**
 * GET /api/staff/orders/[id]/simulate-shipping
 *
 * Get available simulation actions for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, user, supabase: userSupabase } = await requireAuth();
    if (response) return response;

    // Verify user is staff
    const { data: profile } = await userSupabase
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (!profile?.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    const orderId = params.id;

    // Fetch order state
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, shipping_method, unisend_parcel_id, barcode, tracking_url, label_url')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Determine available actions based on current state
    const availableActions: { action: SimulationAction; description: string }[] = [];

    if (order.shipping_method === 't2t') {
      // Can always set/update barcode
      if (!order.barcode) {
        availableActions.push({
          action: 'label_printed',
          description: 'Simulate seller printing label at terminal (assigns barcode)',
        });
      }

      availableActions.push({
        action: 'set_barcode',
        description: 'Manually set a specific barcode',
      });

      // Status transitions
      if (order.status === 'accepted') {
        availableActions.push({
          action: 'shipped',
          description: 'Mark as shipped (parcel dropped at sender terminal)',
        });
      }

      if (['accepted', 'shipped'].includes(order.status)) {
        availableActions.push({
          action: 'in_transit',
          description: 'Mark as in transit',
        });
      }

      if (['shipped', 'in_transit'].includes(order.status)) {
        availableActions.push({
          action: 'delivered',
          description: 'Mark as delivered (buyer picked up at terminal)',
        });
      }
    }

    return NextResponse.json({
      orderId,
      orderNumber: order.order_number,
      currentStatus: order.status,
      shippingMethod: order.shipping_method,
      parcelId: order.unisend_parcel_id,
      barcode: order.barcode,
      trackingUrl: order.tracking_url,
      availableActions,
    });
  } catch (error) {
    return handleApiError(error, 'Get simulation options');
  }
}
