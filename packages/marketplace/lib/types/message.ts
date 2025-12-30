/**
 * Message and Conversation Types
 * Type definitions for the direct messaging system
 */

/**
 * System message types for transaction events
 */
export type SystemMessageType =
  | 'order_created'
  | 'order_accepted'
  | 'order_declined'
  | 'order_cancelled'
  | 'order_shipped'
  | 'order_in_transit'
  | 'order_delivered'
  | 'order_completed'
  | 'receipt_confirmed'
  | 'issue_reported'
  | 'staff_note'
  | 'refund_processed';

/**
 * Message with sender profile information
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null; // null for system messages
  content: string;
  is_system_message: boolean;
  system_message_type?: SystemMessageType | null;
  photo_urls?: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined data
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Conversation with related data (listing, participants, messages)
 */
export interface Conversation {
  id: string;
  listing_id: string | null; // null for order-only or wanted-listing conversations
  order_id?: string | null; // set for transaction conversations (optional for backward compat)
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_archived_at: string | null;
  seller_archived_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined data
  listing?: {
    id: string;
    title: string;
    price: number;
    status: string;
    photos: string[];
    game_id: number;
    game_name?: string;
  } | null;

  order?: {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    shipping_method: string;
  } | null;

  buyer_profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };

  seller_profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };

  last_message?: {
    content: string;
    sender_id: string | null;
    created_at: string;
    is_system_message: boolean;
    system_message_type?: SystemMessageType | null;
  };

  unread_count?: number;
}

/**
 * Conversation list item optimized for inbox display
 */
export interface ConversationListItem {
  id: string;
  listing_id: string | null;
  order_id?: string | null; // optional for backward compat
  other_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    status: string;
    thumbnail: string | null;
  } | null;
  order?: {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
  } | null;
  last_message: {
    content: string;
    sender_id: string | null;
    created_at: string;
    is_system_message: boolean;
    system_message_type?: SystemMessageType | null;
  } | null;
  unread_count: number;
  is_archived: boolean;
  updated_at: string;
}

/**
 * Request to initiate a new conversation
 */
export interface InitiateConversationRequest {
  listing_id: string;
  seller_id: string;
  initial_message?: string;
}

/**
 * Response from initiating a conversation
 */
export interface InitiateConversationResponse {
  conversation_id: string;
  is_new: boolean;
}

/**
 * Request to send a message
 */
export interface SendMessageRequest {
  content: string;
  photo_urls?: string[];
}

/**
 * Request to mark messages as read
 */
export interface MarkAsReadRequest {
  message_id: string;
}

/**
 * Request to archive a conversation
 */
export interface ArchiveConversationRequest {
  archived: boolean;
}

/**
 * Request to block/unblock a user
 */
export interface BlockUserRequest {
  blocked_user_id: string;
  reason?: string;
}

/**
 * Unread count summary
 */
export interface UnreadCount {
  conversation_id: string;
  count: number;
}

/**
 * Total unread messages across all conversations
 */
export interface TotalUnreadCount {
  total: number;
  by_conversation: UnreadCount[];
}

/**
 * Blocked user with profile information
 */
export interface BlockedUser {
  blocked_id: string;
  reason: string | null;
  created_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Real-time message event payload
 */
export interface MessageRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Message;
  old: Message | null;
}

/**
 * Conversation filter options
 */
export interface ConversationFilters {
  include_archived?: boolean;
  listing_id?: string;
  user_id?: string;
}

/**
 * Message validation constraints
 */
export const MESSAGE_CONSTRAINTS = {
  MAX_LENGTH: 5000,
  MIN_LENGTH: 1,
  MAX_PHOTOS: 5,
  MAX_PHOTO_SIZE_MB: 5,
  ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/**
 * Pagination options for message history
 */
export interface MessagePaginationOptions {
  limit?: number;
  before?: string; // message ID
  after?: string; // message ID
}
