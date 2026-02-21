/**
 * Canonical types for the unified order detail views.
 *
 * All three order detail pages (buyer, seller, staff) normalize their
 * API responses into these shapes before passing data to shared components.
 *
 * Re-exports common types from components/shipping for convenience.
 */

// Re-export from shipping (single source of truth)
export type {
  OrderStatus,
  BadgeVariant,
  StatusConfig,
} from '@/components/shipping/ShippingStatusConfig';

export type {
  TrackingEvent,
  ShippingDestination,
  TrackingData,
  ParcelSize,
  OrderIssue,
} from '@/components/shipping/types';

export type { Message } from '@/lib/types/message';

// --- Canonical order shape ---

export interface OrderTimestamps {
  created_at: string;
  paid_at?: string;
  seller_response_deadline?: string;
  seller_responded_at?: string;
  label_generated_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  disputed_at?: string;
  completed_at?: string;
}

export interface OrderPayment {
  everypay_payment_reference?: string;
  everypay_payment_state?: string;
  buyer_wallet_debit_cents?: number;
  platform_commission_cents?: number;
  seller_wallet_credit_cents?: number;
  wallet_credited_at?: string;
}

export interface OrderDetailOrder {
  id: string;
  order_number: string;
  status: string;
  shipping_method: 't2t';
  total_amount: number;
  items_total: number;
  shipping_cost: number;
  refund_amount?: number | null;
  destination: {
    country?: string;
    terminal_id?: string;
    terminal_name?: string;
    terminal_address?: string;
    receiver_name?: string;
    receiver_phone?: string;
    receiver_email?: string;
  };
  tracking: {
    barcode?: string;
    tracking_url?: string;
    label_url?: string;
    parcel_id?: number;
  };
  timestamps: OrderTimestamps;
  // Seller-specific
  parcel_size?: string;
  label_error?: string;
  // Staff-specific
  payment?: OrderPayment;
  refund_reason?: string | null;
}

export interface OrderDetailItem {
  id: string;
  listing_id?: string;
  game_name: string;
  bgg_game_id?: number;
  price: number;
  condition: string;
  photo_url: string | null;
  game_thumbnail?: string | null;
}

export interface OrderDetailUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
  phone?: string;
}

export type ViewerRole = 'buyer' | 'seller' | 'staff';
