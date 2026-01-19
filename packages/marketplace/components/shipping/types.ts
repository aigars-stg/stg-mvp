import type { OrderStatus } from './ShippingStatusConfig';

// Tracking event from database
export interface TrackingEvent {
  id: string;
  event_type: string;
  state_type: string;
  state_text: string;
  location?: string;
  description?: string;
  event_timestamp: string;
}

// Terminal/destination info for T2T shipping
export interface ShippingDestination {
  country?: string;
  terminal_id?: string;
  terminal_name?: string;
  terminal_address?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_email?: string;
}

// Tracking data from Unisend
export interface TrackingData {
  barcode?: string;
  tracking_url?: string;
  label_url?: string;
  parcel_id?: number;
}

// Parcel size options
export type ParcelSize = 'XS' | 'S' | 'M' | 'L';

export interface ParcelSizeOption {
  value: ParcelSize;
  label: string;
  dimensions: string;
}

export const PARCEL_SIZES: ParcelSizeOption[] = [
  { value: 'XS', label: 'XS', dimensions: 'up to 10×7×38 cm' },
  { value: 'S', label: 'S', dimensions: 'up to 38×64×12 cm' },
  { value: 'M', label: 'M', dimensions: 'up to 38×64×39 cm' },
  { value: 'L', label: 'L', dimensions: 'up to 38×64×64 cm' },
];

// Shipping info for display components
export interface ShippingInfo {
  shipping_method: 't2t';
  destination: ShippingDestination;
  tracking?: TrackingData;
  parcel_size?: ParcelSize;
  status: OrderStatus | string;
  label_error?: string;
  label_generated_at?: string;
}

// Order item for display
export interface OrderItem {
  id: string;
  listing_id?: string;
  game_name: string;
  bgg_game_id?: number;
  price: number;
  condition: string;
  photo_url: string | null;
}

// User profile for display
export interface UserProfile {
  id: string;
  full_name: string | null;
  name?: string;
  avatar_url: string | null;
  email?: string;
  phone?: string;
  country?: string;
}

// Timestamps for order timeline
export interface OrderTimestamps {
  created_at: string;
  paid_at?: string;
  seller_response_deadline?: string;
  seller_responded_at?: string;
  label_generated_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
}

// Order issue for staff display
export interface OrderIssue {
  id: string;
  issue_type: string;
  description: string;
  photo_urls: string[];
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter_id: string;
  reporter_role: string;
}

// Issue type labels
export const issueTypeLabels: Record<string, string> = {
  not_received: 'Package Not Received',
  damaged: 'Item Damaged',
  wrong_item: 'Wrong Item',
  not_as_described: 'Not As Described',
  shipping_delay: 'Shipping Delay',
  seller_unresponsive: 'Seller Unresponsive',
  buyer_unresponsive: 'Buyer Unresponsive',
  payment_issue: 'Payment Issue',
  other: 'Other',
};

// Issue status config
export const issueStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' }
> = {
  open: { label: 'Open', variant: 'error' },
  investigating: { label: 'Investigating', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};
