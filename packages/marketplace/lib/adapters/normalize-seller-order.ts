/**
 * Normalizes the flat seller order API response into the canonical
 * OrderDetailOrder shape used by shared components.
 *
 * The seller API (`/api/seller/orders/[id]`) returns a flat structure
 * (e.g. `destination_terminal_name`) while shared components expect
 * nested objects (e.g. `destination.terminal_name`).
 */

import type { SellerOrder } from '@/lib/hooks/useSellerOrderDetail';
import type { OrderDetailOrder, OrderDetailItem } from '@/lib/types/order-detail';

export function normalizeSellerOrder(seller: SellerOrder): OrderDetailOrder {
  return {
    id: seller.id,
    order_number: seller.order_number,
    status: seller.status,
    shipping_method: seller.shipping_method,
    total_amount: seller.total_amount,
    items_total: seller.items_total,
    shipping_cost: seller.shipping_cost,
    destination: {
      terminal_name: seller.destination_terminal_name,
      terminal_address: seller.destination_terminal_address,
      country: seller.destination_country,
      receiver_name: seller.receiver_name,
      receiver_phone: seller.receiver_phone,
      receiver_email: seller.receiver_email,
    },
    tracking: {
      barcode: seller.barcode,
      tracking_url: seller.tracking_url,
      label_url: seller.label_url,
      parcel_id: seller.unisend_parcel_id,
    },
    timestamps: {
      created_at: seller.created_at,
      paid_at: seller.paid_at,
      seller_response_deadline: seller.seller_response_deadline,
      seller_responded_at: seller.seller_responded_at,
      label_generated_at: seller.label_generated_at,
    },
    parcel_size: seller.parcel_size,
    label_error: seller.label_error,
    payment: {
      platform_commission_cents: seller.platform_commission_cents ?? undefined,
      seller_wallet_credit_cents: seller.seller_wallet_credit_cents ?? undefined,
    },
  };
}

export function normalizeSellerOrderItems(
  items: SellerOrder['order_items']
): OrderDetailItem[] {
  return items.map((item) => ({
    id: item.id,
    game_name: item.game_name,
    price: item.price,
    condition: item.condition,
    photo_url: item.photo_url,
    game_thumbnail: item.game_thumbnail,
  }));
}
