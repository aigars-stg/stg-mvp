import {
  Package,
  Time as Clock,
  CheckCircleAlt01 as CheckCircle2,
  CloseCircle as XCircle,
  AlertCircle,
  Truck,
} from '@/lib/icons';
import type { FC, SVGProps } from 'react';

// Order status type - all possible statuses
export type OrderStatus =
  | 'pending_payment'
  | 'pending_seller'
  | 'accepted'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'refunded';

// Badge variant type matching design system
export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'trust';

// Status configuration interface
export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  icon: FC<SVGProps<SVGSVGElement>>;
}

// Unified status configuration - single source of truth
export const orderStatusConfig: Record<OrderStatus, StatusConfig> = {
  pending_payment: {
    label: 'Pending Payment',
    variant: 'warning',
    icon: Clock,
  },
  pending_seller: {
    label: 'Waiting for Seller',
    variant: 'warning',
    icon: Clock,
  },
  accepted: {
    label: 'Accepted',
    variant: 'trust',
    icon: CheckCircle2,
  },
  shipped: {
    label: 'Shipped',
    variant: 'success',
    icon: Truck,
  },
  in_transit: {
    label: 'In Transit',
    variant: 'trust',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    variant: 'success',
    icon: Package,
  },
  completed: {
    label: 'Completed',
    variant: 'success',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'error',
    icon: XCircle,
  },
  disputed: {
    label: 'Disputed',
    variant: 'error',
    icon: AlertCircle,
  },
  refunded: {
    label: 'Refunded',
    variant: 'error',
    icon: XCircle,
  },
};

// Helper to get status config with fallback
export function getStatusConfig(status: string): StatusConfig {
  return (
    orderStatusConfig[status as OrderStatus] || {
      label: status,
      variant: 'default' as BadgeVariant,
      icon: Clock,
    }
  );
}

// Status steps for timeline display - includes all statuses
export const statusSteps = [
  {
    key: 'placed',
    label: 'Order Placed',
    statuses: [
      'pending_payment',
      'pending_seller',
      'accepted',
      'shipped',
      'in_transit',
      'delivered',
      'completed',
    ],
  },
  {
    key: 'pending',
    label: 'Waiting for Seller',
    statuses: [
      'pending_seller',
      'accepted',
      'shipped',
      'in_transit',
      'delivered',
      'completed',
    ],
  },
  {
    key: 'accepted',
    label: 'Seller Accepted',
    statuses: ['accepted', 'shipped', 'in_transit', 'delivered', 'completed'],
  },
  {
    key: 'shipped',
    label: 'Shipped',
    statuses: ['shipped', 'in_transit', 'delivered', 'completed'],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    statuses: ['delivered', 'completed'],
  },
];

// Helper to get step status for timeline
export function getStepStatus(
  step: (typeof statusSteps)[0],
  orderStatus: string
): 'completed' | 'current' | 'pending' {
  if (orderStatus === 'cancelled' || orderStatus === 'refunded' || orderStatus === 'disputed') {
    return 'pending';
  }
  if (step.statuses.includes(orderStatus)) {
    return 'completed';
  }
  return 'pending';
}

// Check if order is in a terminal/inactive state
export function isTerminalStatus(status: string): boolean {
  return ['cancelled', 'refunded', 'disputed', 'completed'].includes(status);
}

// Check if order is cancelled-type (cancelled, refunded)
export function isCancelledStatus(status: string): boolean {
  return ['cancelled', 'refunded'].includes(status);
}

// Tracking state type from Unisend
export type TrackingStateType =
  | 'LABEL_CREATED'
  | 'PARCEL_RECEIVED'
  | 'ON_THE_WAY'
  | 'IN_TRANSIT'
  | 'PARCEL_DELIVERED'
  | 'PARCEL_CANCELED'
  | 'RETURNING';

// Get tracking event color based on state
export function getTrackingEventColor(stateType: string): string {
  switch (stateType) {
    case 'PARCEL_DELIVERED':
      return 'bg-aurora-green';
    case 'ON_THE_WAY':
    case 'IN_TRANSIT':
      return 'bg-frost-ice';
    case 'PARCEL_CANCELED':
    case 'RETURNING':
      return 'bg-aurora-red';
    default:
      return 'bg-text-muted';
  }
}
