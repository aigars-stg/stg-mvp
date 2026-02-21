import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateTransactionConversation } from '@/lib/transactions';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

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

/**
 * GET /api/transactions/[orderId]/conversation
 *
 * Get or create a transaction conversation for an order.
 * Returns conversation with messages, order summary, and tracking events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const orderId = params.orderId;

    // Fetch order and verify access
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
        destination_country,
        destination_terminal_id,
        destination_terminal_name,
        destination_terminal_address,
        pickup_city,
        pickup_notes,
        receiver_name,
        receiver_phone,
        barcode,
        tracking_url,
        label_url,
        created_at,
        paid_at,
        seller_response_deadline,
        seller_responded_at,
        label_generated_at,
        cancelled_at,
        refunded_at,
        disputed_at,
        refund_amount
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify user is buyer or seller
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: 'You do not have access to this transaction' },
        { status: 403 }
      );
    }

    // Get or create conversation for this order
    let conversationId: string;
    try {
      conversationId = await getOrCreateTransactionConversation(orderId);
    } catch {
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 }
      );
    }

    // Fetch conversation with messages
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

    // Fetch messages with sender info
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
      .is('deleted_at', null)
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

    // Attach sender info to messages
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
        bgg_game_id,
        price,
        condition,
        photo_url,
        game_thumbnail
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

    // Fetch buyer and seller profiles
    const { data: buyerProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', order.buyer_id)
      .single();

    const { data: sellerProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', order.seller_id)
      .single();

    // Mark messages as read for current user
    const lastMessage = messagesWithSenders[messagesWithSenders.length - 1];
    if (lastMessage) {
      await supabase
        .from('message_read_status')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          last_read_message_id: lastMessage.id,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,conversation_id'
        });
    }

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
        destination: order.shipping_method === 't2t'
          ? {
              country: order.destination_country,
              terminal_id: order.destination_terminal_id,
              terminal_name: order.destination_terminal_name,
              terminal_address: order.destination_terminal_address,
              receiver_name: order.receiver_name,
              receiver_phone: order.receiver_phone,
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
        timestamps: {
          created_at: order.created_at,
          paid_at: order.paid_at,
          seller_response_deadline: order.seller_response_deadline,
          seller_responded_at: order.seller_responded_at,
          label_generated_at: order.label_generated_at,
          cancelled_at: order.cancelled_at,
          refunded_at: order.refunded_at,
          disputed_at: order.disputed_at,
        },
        refund_amount: order.refund_amount,
      },
      order_items: orderItems || [],
      tracking_events: trackingEvents || [],
      buyer: buyerProfile,
      seller: sellerProfile,
      current_user: {
        id: user.id,
        role: isBuyer ? 'buyer' : 'seller',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Load transaction');
  }
}
