import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrCreateTransactionConversation } from '@/lib/transactions';
import { createServiceClient } from '@/lib/supabase/client';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  is_system_message: boolean;
  system_message_type: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface IssueRow {
  id: string;
  issue_type: string;
  description: string;
  photo_urls: string[];
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  reporter_id: string;
  reporter_role: string;
}

/**
 * GET /api/staff/transactions/[orderId]
 *
 * Staff-only endpoint to view any transaction.
 * Returns full order details, conversation, messages, and issues.
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
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify staff status using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    const orderId = params.orderId;

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        buyer_id,
        seller_id,
        status,
        shipping_method,
        total_amount,
        items_total,
        shipping_cost,
        service_fee,
        destination_country,
        destination_terminal_id,
        destination_terminal_name,
        destination_terminal_address,
        pickup_city,
        pickup_notes,
        receiver_name,
        receiver_phone,
        receiver_email,
        barcode,
        tracking_url,
        label_url,
        stripe_payment_intent_id,
        stripe_transfer_id,
        created_at,
        paid_at,
        seller_response_deadline,
        seller_responded_at,
        label_generated_at,
        cancelled_at,
        refunded_at
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get or create conversation
    let conversationId: string;
    try {
      conversationId = await getOrCreateTransactionConversation(orderId);
    } catch {
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 }
      );
    }

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        order_id,
        listing_id,
        buyer_id,
        seller_id,
        created_at,
        updated_at
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 }
      );
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        is_system_message,
        system_message_type,
        photo_urls,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      // Continue - non-blocking error
    }

    // Fetch user profiles for messages
    const typedMessages = (messages || []) as MessageRow[];
    const senderIds = [...new Set(
      typedMessages
        .filter((m: MessageRow) => m.sender_id)
        .map((m: MessageRow) => m.sender_id as string)
    )];

    const { data: senderProfiles } = senderIds.length > 0
      ? await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds)
      : { data: [] };

    const senderMap = new Map(
      ((senderProfiles || []) as ProfileRow[]).map((p: ProfileRow) => [p.id, p])
    );

    // Attach sender info to messages (include deleted for staff view)
    const messagesWithSenders = typedMessages.map((msg: MessageRow) => ({
      ...msg,
      sender: msg.sender_id ? senderMap.get(msg.sender_id) || null : null,
    }));

    // Fetch order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        id,
        listing_id,
        game_name,
        game_bgg_id,
        price,
        condition,
        photo_url
      `)
      .eq('order_id', orderId);

    // Fetch tracking events
    const { data: trackingEvents } = await supabase
      .from('tracking_events')
      .select(`
        id,
        event_type,
        state_type,
        state_text,
        location,
        description,
        event_timestamp,
        created_at
      `)
      .eq('order_id', orderId)
      .order('event_timestamp', { ascending: true });

    // Fetch order issues
    const { data: issues } = await supabase
      .from('order_issues')
      .select(`
        id,
        issue_type,
        description,
        photo_urls,
        status,
        resolution_notes,
        resolved_at,
        resolved_by,
        created_at,
        reporter_id,
        reporter_role
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    // Fetch buyer and seller profiles (with full info for staff)
    const { data: buyerProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, email, phone')
      .eq('id', order.buyer_id)
      .single();

    const { data: sellerProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, email, phone')
      .eq('id', order.seller_id)
      .single();

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        order_id: conversation.order_id,
        listing_id: conversation.listing_id,
        buyer_id: conversation.buyer_id,
        seller_id: conversation.seller_id,
        created_at: conversation.created_at,
      },
      messages: messagesWithSenders,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        shipping_method: order.shipping_method,
        total_amount: order.total_amount,
        items_total: order.items_total,
        shipping_cost: order.shipping_cost,
        service_fee: order.service_fee,
        destination: order.shipping_method === 't2t'
          ? {
              country: order.destination_country,
              terminal_id: order.destination_terminal_id,
              terminal_name: order.destination_terminal_name,
              terminal_address: order.destination_terminal_address,
              receiver_name: order.receiver_name,
              receiver_phone: order.receiver_phone,
              receiver_email: order.receiver_email,
            }
          : {
              city: order.pickup_city,
              notes: order.pickup_notes,
            },
        tracking: {
          barcode: order.barcode,
          tracking_url: order.tracking_url,
          label_url: order.label_url,
        },
        stripe: {
          payment_intent_id: order.stripe_payment_intent_id,
          transfer_id: order.stripe_transfer_id,
        },
        timestamps: {
          created_at: order.created_at,
          paid_at: order.paid_at,
          seller_response_deadline: order.seller_response_deadline,
          seller_responded_at: order.seller_responded_at,
          label_generated_at: order.label_generated_at,
          cancelled_at: order.cancelled_at,
          refunded_at: order.refunded_at,
        },
      },
      order_items: orderItems || [],
      tracking_events: trackingEvents || [],
      issues: (issues || []) as IssueRow[],
      buyer: buyerProfile,
      seller: sellerProfile,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load transaction', details: message },
      { status: 500 }
    );
  }
}
