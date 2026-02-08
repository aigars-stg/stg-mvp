'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { TrackingEvent } from '@/components/shipping';

type ParcelSize = 'XS' | 'S' | 'M' | 'L';

export const PARCEL_SIZES: { value: ParcelSize; label: string; dimensions: string }[] = [
  { value: 'XS', label: 'XS', dimensions: 'up to 10×7×38 cm' },
  { value: 'S', label: 'S', dimensions: 'up to 38×64×12 cm' },
  { value: 'M', label: 'M', dimensions: 'up to 38×64×39 cm' },
  { value: 'L', label: 'L', dimensions: 'up to 38×64×64 cm' },
];

interface OrderItem {
  id: string;
  game_name: string;
  price: number;
  condition: string;
  photo_url: string | null;
}

export interface SellerOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  status: string;
  shipping_method: 't2t' | 'local_pickup';
  destination_terminal_name?: string;
  destination_terminal_address?: string;
  destination_country?: string;
  pickup_city?: string;
  pickup_notes?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_email?: string;
  items_total: number;
  shipping_cost: number;
  total_amount: number;
  created_at: string;
  paid_at: string;
  seller_response_deadline?: string;
  seller_responded_at?: string;
  parcel_size?: ParcelSize;
  unisend_parcel_id?: number;
  barcode?: string;
  tracking_url?: string;
  label_url?: string;
  label_generated_at?: string;
  label_error?: string;
  order_items: OrderItem[];
  tracking_events?: TrackingEvent[];
  time_remaining_ms: number | null;
  is_expired: boolean;
}

export const statusConfig = {
  pending_payment: { label: 'Pending Payment', color: 'default', icon: 'Clock' },
  pending_seller: { label: 'Waiting for Your Response', color: 'warning', icon: 'Clock' },
  accepted: { label: 'Accepted', color: 'trust', icon: 'CheckCircle2' },
  shipped: { label: 'Shipped', color: 'success', icon: 'Truck' },
  in_transit: { label: 'In Transit', color: 'info', icon: 'Truck' },
  delivered: { label: 'Delivered', color: 'success', icon: 'Package' },
  completed: { label: 'Completed', color: 'default', icon: 'CheckCircle2' },
  cancelled: { label: 'Cancelled', color: 'danger', icon: 'XCircle' },
  disputed: { label: 'Disputed', color: 'danger', icon: 'AlertCircle' },
} as const;

export interface UseSellerOrderDetailReturn {
  // Data
  order: SellerOrder | null;
  loading: boolean;
  error: string | null;
  authLoading: boolean;
  user: ReturnType<typeof useAuth>['user'];

  // Accept/Decline modal state
  showAcceptModal: boolean;
  setShowAcceptModal: (show: boolean) => void;
  showDeclineModal: boolean;
  setShowDeclineModal: (show: boolean) => void;
  selectedParcelSize: ParcelSize;
  setSelectedParcelSize: (size: ParcelSize) => void;
  declineReason: string;
  setDeclineReason: (reason: string) => void;

  // Action state
  actionLoading: boolean;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  timeRemaining: string | null;

  // Label retry state
  retryingLabel: boolean;
  retryError: string | null;

  // Actions
  handleAcceptOrder: () => Promise<void>;
  handleDeclineOrder: () => Promise<void>;
  handleRetryLabel: () => Promise<void>;
  fetchOrder: () => Promise<void>;

  // Helpers
  getStatusConfig: (status: string) => typeof statusConfig[keyof typeof statusConfig];
}

export function useSellerOrderDetail(orderId: string): UseSellerOrderDetailReturn {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<SellerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accept/Decline state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedParcelSize, setSelectedParcelSize] = useState<ParcelSize>('M');
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [retryingLabel, setRetryingLabel] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/orders');
    }
  }, [user, authLoading, router]);

  // Fetch order details
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/seller/orders/${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order');
      }

      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (user) {
      fetchOrder();
    }
  }, [user, fetchOrder]);

  // Update countdown timer for response deadline
  useEffect(() => {
    if (!order?.seller_response_deadline || order.status !== 'pending_seller') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(order.seller_response_deadline!).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [order?.seller_response_deadline, order?.status]);

  // Handle accept order
  const handleAcceptOrder = useCallback(async () => {
    if (order?.shipping_method === 't2t' && !selectedParcelSize) {
      setActionError('Please select a parcel size');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      const response = await fetch(`/api/seller/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelSize: order?.shipping_method === 't2t' ? selectedParcelSize : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept order');
      }

      // Refresh order data
      await fetchOrder();
      setShowAcceptModal(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  }, [order?.shipping_method, selectedParcelSize, orderId, fetchOrder]);

  // Handle decline order
  const handleDeclineOrder = useCallback(async () => {
    try {
      setActionLoading(true);
      setActionError(null);

      const response = await fetch(`/api/seller/orders/${orderId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: declineReason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline order');
      }

      // Redirect to orders list after declining
      router.push('/seller/orders');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to decline order');
      setActionLoading(false);
    }
  }, [orderId, declineReason, router]);

  // Handle retry label generation
  const handleRetryLabel = useCallback(async () => {
    try {
      setRetryingLabel(true);
      setRetryError(null);

      const response = await fetch(`/api/seller/orders/${orderId}/retry-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate label');
      }

      // Refresh order data to show the new label
      await fetchOrder();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Failed to generate label');
    } finally {
      setRetryingLabel(false);
    }
  }, [orderId, fetchOrder]);

  // Get status config
  const getStatusConfig = useCallback((status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment;
  }, []);

  return {
    // Data
    order,
    loading,
    error,
    authLoading,
    user,

    // Accept/Decline modal state
    showAcceptModal,
    setShowAcceptModal,
    showDeclineModal,
    setShowDeclineModal,
    selectedParcelSize,
    setSelectedParcelSize,
    declineReason,
    setDeclineReason,

    // Action state
    actionLoading,
    actionError,
    setActionError,
    timeRemaining,

    // Label retry state
    retryingLabel,
    retryError,

    // Actions
    handleAcceptOrder,
    handleDeclineOrder,
    handleRetryLabel,
    fetchOrder,

    // Helpers
    getStatusConfig,
  };
}
