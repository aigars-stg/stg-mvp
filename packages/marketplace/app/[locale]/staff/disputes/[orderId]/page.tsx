'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { Button, Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  Shield,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  User,
  Time as Clock,
} from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import type { TrackingEvent, OrderIssue } from '@/components/shipping';
import type { Message } from '@/lib/types/message';
import type {
  OrderDetailOrder,
  OrderDetailItem,
  OrderTimestamps,
  OrderPayment,
} from '@/lib/types/order-detail';
import { formatDateTime } from '@/lib/date-utils';
import { formatPrice, formatCentsToCurrency } from '@/lib/services/pricing';

// Extended order type for dispute detail page
// The API returns additional dispute fields not present in the base OrderDetailOrder type.
// We define them here until the canonical type is updated.
interface DisputeOrder extends OrderDetailOrder {
  dispute_reason?: string | null;
  dispute_description?: string | null;
  dispute_status?: string | null;
  dispute_seller_response?: string | null;
  dispute_seller_responded_at?: string | null;
  dispute_seller_deadline?: string | null;
  dispute_photo_urls?: string[] | null;
  dispute_resolved_at?: string | null;
  dispute_resolution?: string | null;
  dispute_resolution_note?: string | null;
  payment_method?: string | null;
  refund_status?: string | null;
  refund_method?: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
  phone?: string;
}

interface StaffTransactionData {
  conversation: { id: string; buyer_id: string; seller_id: string };
  messages: Message[];
  order: DisputeOrder;
  order_items: OrderDetailItem[];
  tracking_events: TrackingEvent[];
  issues: OrderIssue[];
  buyer: UserProfile | null;
  seller: UserProfile | null;
}

type ResolutionType =
  | 'buyer_full_refund'
  | 'buyer_partial_refund'
  | 'seller_favor'
  | 'mutual_agreement';

const resolutionLabels: Record<ResolutionType, string> = {
  buyer_full_refund: 'Full refund to buyer',
  buyer_partial_refund: 'Partial refund to buyer',
  seller_favor: 'Resolve in seller favor',
  mutual_agreement: 'Mutual agreement (seller credited)',
};

export default function StaffDisputeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<StaffTransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  // Resolution form state
  const [resolutionType, setResolutionType] = useState<ResolutionType | ''>('');
  const [refundAmountCents, setRefundAmountCents] = useState<number>(0);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // SEPA confirmation state
  const [sepaReference, setSepaReference] = useState('');
  const [sepaSubmitting, setSepaSubmitting] = useState(false);
  const [sepaMessage, setSepaMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirectTo=/staff/disputes/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/staff/transactions/${orderId}`);
      const result = await response.json();

      if (response.status === 403) {
        setIsStaff(false);
        setError('Staff access required');
        return;
      }
      if (!response.ok)
        throw new Error(result.error || 'Failed to fetch order');

      setIsStaff(true);
      setData(result);

      // Pre-fill refund amount with total
      if (result.order?.total_amount) {
        setRefundAmountCents(Math.round(result.order.total_amount * 100));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dispute'
      );
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user && orderId) fetchData();
  }, [user, orderId]);

  const handleResolve = async () => {
    if (!resolutionType || resolutionNote.trim().length < 10) return;

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const body: Record<string, unknown> = {
        resolution_type: resolutionType,
        resolution_notes: resolutionNote.trim(),
      };
      if (resolutionType === 'buyer_partial_refund') {
        body.refund_amount_cents = refundAmountCents;
      }

      const response = await fetch(
        `/api/admin/disputes/${orderId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setSubmitMessage({
          type: 'error',
          text: result.error || 'Failed to resolve dispute',
        });
        return;
      }

      setSubmitMessage({
        type: 'success',
        text: `Dispute resolved: ${resolutionLabels[resolutionType]}. Order status: ${result.finalStatus}.${result.requiresManualSepa ? ' Manual SEPA refund required.' : ''}`,
      });

      // Refresh data
      await fetchData();
    } catch {
      setSubmitMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSepaConfirm = async () => {
    if (!sepaReference.trim()) return;

    setSepaSubmitting(true);
    setSepaMessage(null);

    try {
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          refund_type: 'confirm_sepa',
          sepa_reference: sepaReference.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setSepaMessage({
          type: 'error',
          text: result.error || 'Failed to confirm SEPA refund',
        });
        return;
      }

      setSepaMessage({ type: 'success', text: 'SEPA refund confirmed' });
      await fetchData();
    } catch {
      setSepaMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      });
    } finally {
      setSepaSubmitting(false);
    }
  };

  // --- Access denied ---
  if (isStaff === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-aurora-red mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
            Staff Access Required
          </h1>
          <p className="text-text-secondary mb-6">
            This page is only accessible to staff members.
          </p>
          <Link href="/">
            <Button variant="accent">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- Loading ---
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading dispute...</p>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || 'Dispute not found'}
          </h2>
          <Link href="/staff/disputes">
            <Button variant="accent">Back to Disputes</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const { order, order_items, tracking_events, buyer, seller } = data;

  const isResolved =
    order.dispute_status === 'resolved' ||
    order.status === 'refunded' ||
    order.status === 'completed';
  const isDisputed = order.status === 'disputed';

  const disputeStatusVariant = (
    status: string | null | undefined
  ): 'default' | 'warning' | 'trust' | 'success' => {
    switch (status) {
      case 'awaiting_seller':
        return 'warning';
      case 'under_review':
        return 'trust';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary pb-48">
      {/* Header */}
      <div className="bg-snow-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/staff/disputes"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-polar-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Disputes
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
              Dispute: {order.order_number}
            </h1>
            <Badge variant="error" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Disputed
            </Badge>
            {order.dispute_status && (
              <Badge
                variant={disputeStatusVariant(order.dispute_status)}
                size="sm"
              >
                {order.dispute_status.replace(/_/g, ' ')}
              </Badge>
            )}
            <Badge variant="default" size="sm">
              <Shield className="w-3 h-3 mr-1" />
              Staff
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Created {formatDateTime(order.timestamps.created_at)}
            {order.timestamps.disputed_at &&
              ` | Disputed ${formatDateTime(order.timestamps.disputed_at)}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Buyer's Claim */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-aurora-red" />
                Buyer&apos;s Claim
              </h3>
              {order.dispute_reason && (
                <div className="mb-3">
                  <span className="text-xs text-text-muted">Reason</span>
                  <p className="font-medium text-polar-night capitalize">
                    {order.dispute_reason.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              {order.dispute_description && (
                <div className="mb-3">
                  <span className="text-xs text-text-muted">Description</span>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">
                    {order.dispute_description}
                  </p>
                </div>
              )}
              {order.dispute_photo_urls &&
                order.dispute_photo_urls.length > 0 && (
                  <div>
                    <span className="text-xs text-text-muted">
                      Photos ({order.dispute_photo_urls.length})
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.dispute_photo_urls.map(
                        (url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative w-20 h-20 rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow"
                          >
                            <Image
                              src={url}
                              alt={`Dispute evidence ${idx + 1}`}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
              {!order.dispute_reason && !order.dispute_description && (
                <p className="text-sm text-text-muted italic">
                  No dispute details provided.
                </p>
              )}
            </div>

            {/* Seller's Response */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-frost-ice" />
                Seller&apos;s Response
              </h3>
              {order.dispute_seller_response ? (
                <>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap mb-2">
                    {order.dispute_seller_response}
                  </p>
                  {order.dispute_seller_responded_at && (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Responded{' '}
                      {formatDateTime(order.dispute_seller_responded_at)}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-sm text-text-muted italic">
                  {order.dispute_seller_deadline ? (
                    <p>
                      Awaiting seller response. Deadline:{' '}
                      {formatDateTime(order.dispute_seller_deadline)}
                    </p>
                  ) : (
                    <p>No response from seller yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4">
                Order Items ({order_items.length})
              </h3>
              <div className="space-y-3">
                {order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {item.photo_url && (
                        <div className="relative w-10 h-10 rounded overflow-hidden border border-border flex-shrink-0">
                          <Image
                            src={item.photo_url}
                            alt={item.game_name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      )}
                      <span className="text-sm font-medium text-polar-night">
                        {item.game_name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-polar-night">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                Timeline
              </h3>
              <div className="space-y-3">
                {order.timestamps.created_at && (
                  <TimelineEntry
                    label="Order created"
                    time={order.timestamps.created_at}
                  />
                )}
                {order.timestamps.seller_responded_at && (
                  <TimelineEntry
                    label="Accepted by seller"
                    time={order.timestamps.seller_responded_at}
                  />
                )}
                {order.timestamps.label_generated_at && (
                  <TimelineEntry
                    label="Label generated"
                    time={order.timestamps.label_generated_at}
                  />
                )}
                {order.timestamps.disputed_at && (
                  <TimelineEntry
                    label="Dispute opened"
                    time={order.timestamps.disputed_at}
                    highlight
                  />
                )}
                {order.dispute_seller_responded_at && (
                  <TimelineEntry
                    label="Seller responded to dispute"
                    time={order.dispute_seller_responded_at}
                  />
                )}
                {order.dispute_resolved_at && (
                  <TimelineEntry
                    label="Dispute resolved"
                    time={order.dispute_resolved_at}
                    highlight
                  />
                )}
                {order.timestamps.completed_at && (
                  <TimelineEntry
                    label="Order completed"
                    time={order.timestamps.completed_at}
                  />
                )}
                {order.timestamps.cancelled_at && (
                  <TimelineEntry
                    label="Order cancelled"
                    time={order.timestamps.cancelled_at}
                  />
                )}
                {order.timestamps.refunded_at && (
                  <TimelineEntry
                    label="Refunded"
                    time={order.timestamps.refunded_at}
                    highlight
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right column - sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Info */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-3">
                Order Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Order number</span>
                  <span className="font-medium text-polar-night">
                    {order.order_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total</span>
                  <span className="font-medium text-polar-night">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status</span>
                  <Badge
                    variant={
                      order.status === 'disputed'
                        ? 'error'
                        : order.status === 'refunded'
                          ? 'warning'
                          : order.status === 'completed'
                            ? 'success'
                            : 'default'
                    }
                    size="sm"
                  >
                    {order.status}
                  </Badge>
                </div>
                {order.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Payment method</span>
                    <span className="text-polar-night capitalize">
                      {order.payment_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {order.dispute_resolution && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Resolution</span>
                    <span className="text-polar-night capitalize">
                      {order.dispute_resolution.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {order.dispute_resolution_note && (
                  <div className="pt-2 border-t border-border-subtle">
                    <span className="text-text-muted text-xs">
                      Resolution note
                    </span>
                    <p className="text-sm text-text-secondary mt-1">
                      {order.dispute_resolution_note}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4">
                Participants
              </h3>
              <div className="mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />
                  BUYER
                </div>
                <p className="font-medium text-polar-night">
                  {buyer?.full_name || 'Unknown'}
                </p>
                {buyer?.email && (
                  <p className="text-sm text-text-secondary mt-1">
                    {buyer.email}
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />
                  SELLER
                </div>
                <p className="font-medium text-polar-night">
                  {seller?.full_name || 'Unknown'}
                </p>
                {seller?.email && (
                  <p className="text-sm text-text-secondary mt-1">
                    {seller.email}
                  </p>
                )}
              </div>
            </div>

            {/* Tracking Events */}
            {tracking_events.length > 0 && (
              <div className="bg-snow-white border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  Tracking ({tracking_events.length} events)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tracking_events.map((event) => (
                    <div
                      key={event.id}
                      className="text-xs border-b border-border-subtle last:border-0 pb-2 last:pb-0"
                    >
                      <p className="font-medium text-polar-night">
                        {event.state_text || event.event_type}
                      </p>
                      {event.description && (
                        <p className="text-text-secondary">
                          {event.description}
                        </p>
                      )}
                      {event.event_timestamp && (
                        <p className="text-text-muted mt-0.5">
                          {formatDateTime(event.event_timestamp)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refund Status */}
            {order.refund_status && (
              <div
                className={`border rounded-xl p-4 ${
                  order.refund_status === 'manual_sepa_required'
                    ? 'bg-aurora-yellow/5 border-aurora-yellow/30'
                    : order.refund_status === 'completed'
                      ? 'bg-aurora-green/5 border-aurora-green/30'
                      : 'bg-snow-white border-border'
                }`}
              >
                <h3 className="text-sm font-semibold text-polar-night mb-3">
                  Refund Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Status</span>
                    <Badge
                      variant={
                        order.refund_status === 'completed'
                          ? 'success'
                          : order.refund_status === 'manual_sepa_required'
                            ? 'warning'
                            : 'default'
                      }
                      size="sm"
                    >
                      {order.refund_status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {order.refund_method && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Method</span>
                      <span className="text-polar-night capitalize">
                        {order.refund_method.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {order.refund_amount != null && order.refund_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Amount</span>
                      <span className="font-medium text-aurora-red">
                        {formatPrice(order.refund_amount)}
                      </span>
                    </div>
                  )}
                  {order.payment?.buyer_wallet_debit_cents != null &&
                    order.payment.buyer_wallet_debit_cents > 0 && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Wallet portion</span>
                        <span className="text-polar-night">
                          {formatCentsToCurrency(
                            order.payment.buyer_wallet_debit_cents
                          )}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEPA Confirmation Section */}
      {order.refund_status === 'manual_sepa_required' && (
        <div className="fixed bottom-0 left-0 right-0 bg-aurora-yellow/10 border-t-2 border-aurora-yellow z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <h3 className="text-sm font-semibold text-polar-night mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-aurora-yellow" />
              Manual SEPA Refund Required
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              This order was paid via bank link. Process the SEPA transfer
              manually and enter the reference below.
            </p>
            {sepaMessage && (
              <div
                className={`p-3 rounded-lg mb-3 text-sm ${
                  sepaMessage.type === 'success'
                    ? 'bg-aurora-green/10 text-aurora-green border border-aurora-green/30'
                    : 'bg-aurora-red/10 text-aurora-red border border-aurora-red/30'
                }`}
              >
                {sepaMessage.text}
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-md">
                <label className="block text-xs text-text-muted mb-1">
                  SEPA Transfer Reference
                </label>
                <input
                  type="text"
                  value={sepaReference}
                  onChange={(e) => setSepaReference(e.target.value)}
                  placeholder="e.g. SEPA-2026-03-05-001"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice"
                />
              </div>
              <Button
                variant="accent"
                size="sm"
                onClick={handleSepaConfirm}
                disabled={sepaSubmitting || !sepaReference.trim()}
              >
                {sepaSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirm SEPA Refund'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Action Bar */}
      {isDisputed &&
        !isResolved &&
        order.refund_status !== 'manual_sepa_required' && (
          <div className="fixed bottom-0 left-0 right-0 bg-snow-white border-t-2 border-frost-ice shadow-xl z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <h3 className="text-sm font-semibold text-polar-night mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-frost-ice" />
                Resolve Dispute
              </h3>

              {submitMessage && (
                <div
                  className={`p-3 rounded-lg mb-3 text-sm ${
                    submitMessage.type === 'success'
                      ? 'bg-aurora-green/10 text-aurora-green border border-aurora-green/30'
                      : 'bg-aurora-red/10 text-aurora-red border border-aurora-red/30'
                  }`}
                >
                  {submitMessage.text}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-4">
                {/* Resolution type */}
                <div className="w-full sm:w-auto">
                  <label className="block text-xs text-text-muted mb-1">
                    Resolution
                  </label>
                  <select
                    value={resolutionType}
                    onChange={(e) =>
                      setResolutionType(
                        e.target.value as ResolutionType | ''
                      )
                    }
                    className="w-full sm:w-64 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice bg-snow-white"
                  >
                    <option value="">Select resolution...</option>
                    {Object.entries(resolutionLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Partial refund amount */}
                {resolutionType === 'buyer_partial_refund' && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Refund amount (cents)
                    </label>
                    <input
                      type="number"
                      value={refundAmountCents}
                      onChange={(e) =>
                        setRefundAmountCents(parseInt(e.target.value) || 0)
                      }
                      min={1}
                      className="w-32 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice"
                    />
                    <span className="text-xs text-text-muted ml-2">
                      = {formatCentsToCurrency(refundAmountCents)}
                    </span>
                  </div>
                )}

                {/* Notes */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-text-muted mb-1">
                    Resolution note (min 10 chars)
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={2}
                    placeholder="Describe the resolution and reasoning..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice resize-none"
                  />
                </div>

                {/* Submit */}
                <div>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleResolve}
                    disabled={
                      submitting ||
                      !resolutionType ||
                      resolutionNote.trim().length < 10
                    }
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Resolve Dispute'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function TimelineEntry({
  label,
  time,
  highlight,
}: {
  label: string;
  time: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm py-1.5 ${
        highlight ? 'text-aurora-red font-medium' : 'text-text-secondary'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-text-muted">{formatDateTime(time)}</span>
    </div>
  );
}
