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
  country?: string | null;
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

    const orderParam = params.orderId;
    const isOrderNumber = orderParam.startsWith('STG-');

    // Fetch order and verify access (supports both UUID and order_number lookup)
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
        dispute_reason,
        dispute_description,
        dispute_status,
        dispute_seller_response,
        dispute_seller_responded_at,
        dispute_seller_deadline,
        dispute_photo_urls,
        dispute_resolved_at,
        dispute_resolution,
        dispute_resolution_note,
        refund_amount,
        refund_status,
        payment_method,
        platform_commission_cents,
        seller_wallet_credit_cents,
        parcel_size,
        unisend_parcel_id,
        label_error,
        invoice_number,
        credit_note_number,
        cancellation_reason
      `)
      .eq(isOrderNumber ? 'order_number' : 'id', orderParam)
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
      conversationId = await getOrCreateTransactionConversation(order.id);
    } catch {
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 }
      );
    }

    // Fetch conversation, messages, order items, tracking events, and profiles in parallel
    const [
      { data: conversation, error: convError },
      { data: messages },
      { data: orderItems },
      { data: trackingEvents },
      { data: buyerProfile },
      { data: sellerProfile },
    ] = await Promise.all([
      supabase
        .from('conversations')
        .select('id, order_id, listing_id, buyer_id, seller_id, created_at, updated_at')
        .eq('id', conversationId)
        .single(),
      supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, is_system_message, system_message_type, photo_urls, created_at, updated_at, deleted_at')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('order_items')
        .select(`
          id, listing_id, game_name, bgg_game_id, price, condition, photo_url, game_thumbnail,
          listing:listings (
            photo_urls, condition_notes, all_components_present, missing_components,
            language, version_name, edition_year, publisher, shipping_notes, included_expansions,
            bgg_version_id,
            game:games (image, versions)
          )
        `)
        .eq('order_id', order.id),
      supabase
        .from('tracking_events')
        .select('id, event_type, state_type, state_text, location, description, event_timestamp, created_at')
        .eq('order_id', order.id)
        .order('event_timestamp', { ascending: true }),
      supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, country')
        .eq('id', order.buyer_id)
        .single(),
      supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, country')
        .eq('id', order.seller_id)
        .single(),
    ]);

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 }
      );
    }

    // Fetch user profiles for message senders
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
          ...(isSeller && { parcel_id: order.unisend_parcel_id }),
        },
        ...(isSeller && {
          parcel_size: order.parcel_size,
          label_error: order.label_error,
          payment: {
            platform_commission_cents: order.platform_commission_cents,
            seller_wallet_credit_cents: order.seller_wallet_credit_cents,
          },
        }),
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
        cancellation_reason: order.cancellation_reason,
        refund_amount: order.refund_amount,
        refund_status: order.refund_status,
        payment_method: order.payment_method,
        invoice_number: order.invoice_number,
        credit_note_number: order.credit_note_number,
        dispute: order.disputed_at ? {
          reason: order.dispute_reason,
          description: order.dispute_description,
          status: order.dispute_status,
          seller_response: order.dispute_seller_response,
          seller_responded_at: order.dispute_seller_responded_at,
          seller_deadline: order.dispute_seller_deadline,
          photo_urls: order.dispute_photo_urls,
          resolved_at: order.dispute_resolved_at,
          resolution: order.dispute_resolution,
          resolution_note: order.dispute_resolution_note,
        } : null,
      },
      order_items: (orderItems || []).map(({ listing, ...item }) => {
        type BGGVersion = { id: number; image?: string | null; thumbnail?: string | null };
        type ListingWithGame = {
          bgg_version_id?: number | null;
          game?: { image?: string | null; versions?: BGGVersion[] | null } | null;
          [key: string]: unknown;
        };
        const { game: gameData, bgg_version_id, ...listingRest } = (listing ?? {}) as ListingWithGame;
        // Resolve version-specific image, same logic as offers API
        let gameImage = gameData?.image ?? null;
        if (bgg_version_id && gameData?.versions) {
          const version = (gameData.versions as BGGVersion[]).find(v => v.id === bgg_version_id);
          if (version?.image) gameImage = version.image;
        }
        return {
          ...item,
          ...listingRest,
          game_image: gameImage,
        };
      }),
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
