import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import { postIssueReportedMessage } from '@/lib/transactions';

/**
 * Valid issue types for order disputes
 */
const VALID_ISSUE_TYPES = [
  'not_received',
  'damaged',
  'wrong_item',
  'not_as_described',
  'shipping_delay',
  'seller_unresponsive',
  'buyer_unresponsive',
  'payment_issue',
  'other',
] as const;

type IssueType = (typeof VALID_ISSUE_TYPES)[number];

interface ReportIssueRequest {
  issue_type: IssueType;
  description: string;
  photo_urls?: string[];
}

/**
 * POST /api/transactions/[orderId]/report-issue
 *
 * Report an issue with an order. Available for both buyer and seller.
 * Creates an order_issues record and posts a system message.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to report an issue' },
        { status: 401 }
      );
    }

    const orderId = params.orderId;

    // Parse and validate request body
    const body: ReportIssueRequest = await request.json();

    if (!body.issue_type || !VALID_ISSUE_TYPES.includes(body.issue_type)) {
      return NextResponse.json(
        { error: 'Invalid issue type', valid_types: VALID_ISSUE_TYPES },
        { status: 400 }
      );
    }

    if (!body.description || body.description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (body.description.length > 2000) {
      return NextResponse.json(
        { error: 'Description cannot exceed 2000 characters' },
        { status: 400 }
      );
    }

    // Verify order exists and user has access
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, buyer_id, seller_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is buyer or seller
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: 'You do not have access to this order' },
        { status: 403 }
      );
    }

    // Check order is in a valid state for reporting issues
    const validStatuses = ['accepted', 'shipped', 'in_transit', 'delivered', 'completed'];
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot report issues for orders with status '${order.status}'` },
        { status: 400 }
      );
    }

    // Use service client to call the report_order_issue function
    const serviceClient = createServiceClient();

    const { data: result, error: issueError } = await serviceClient.rpc(
      'report_order_issue',
      {
        p_order_id: orderId,
        p_reporter_id: user.id,
        p_issue_type: body.issue_type,
        p_description: body.description.trim(),
        p_photo_urls: body.photo_urls || [],
      }
    );

    if (issueError) {
      return NextResponse.json(
        { error: 'Failed to report issue' },
        { status: 500 }
      );
    }

    // Check if the database function returned an error
    const dbResult = result as { success: boolean; error?: string; issue_id?: string };
    if (!dbResult.success) {
      return NextResponse.json(
        { error: dbResult.error || 'Failed to report issue' },
        { status: 400 }
      );
    }

    // Post system message about the issue
    const issueLabels: Record<IssueType, string> = {
      not_received: 'Package not received',
      damaged: 'Item damaged',
      wrong_item: 'Wrong item received',
      not_as_described: 'Item not as described',
      shipping_delay: 'Shipping delay',
      seller_unresponsive: 'Seller unresponsive',
      buyer_unresponsive: 'Buyer unresponsive',
      payment_issue: 'Payment issue',
      other: 'Other issue',
    };

    await postIssueReportedMessage(orderId, issueLabels[body.issue_type]);

    return NextResponse.json({
      success: true,
      issue_id: dbResult.issue_id,
      order_number: order.order_number,
      message: 'Issue reported successfully. Our team will review and respond.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to report issue', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions/[orderId]/report-issue
 *
 * Get existing issues for an order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }

    const orderId = params.orderId;

    // Verify order exists and user has access
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this order' },
        { status: 403 }
      );
    }

    // Fetch issues for this order
    const { data: issues, error: issuesError } = await supabase
      .from('order_issues')
      .select(`
        id,
        issue_type,
        description,
        photo_urls,
        status,
        resolution_notes,
        resolved_at,
        created_at,
        reporter_id,
        reporter_role
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (issuesError) {
      return NextResponse.json(
        { error: 'Failed to fetch issues' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      issues: issues || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch issues', details: message },
      { status: 500 }
    );
  }
}
