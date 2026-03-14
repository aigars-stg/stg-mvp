'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { Button, Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  User,
  Time as Clock,
} from '@/lib/icons';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import type { TrackingEvent } from '@/components/shipping';
import type { OrderDetailItem } from '@/lib/types/order-detail';
import { OrderItemsList } from '@/components/order-detail';
import { DisputeClaimCard } from '@/components/staff/DisputeClaimCard';
import { DisputeSellerResponse } from '@/components/staff/DisputeSellerResponse';
import {
  DisputeResolutionForm,
  SepaConfirmationForm,
} from '@/components/staff/DisputeResolutionForm';
import { formatDateTime } from '@/lib/date-utils';
import { formatPrice, formatCentsToCurrency } from '@/lib/services/pricing';

// Extended order type for dispute detail page
interface DisputeOrder {
  order_number: string;
  status: string;
  total_amount: number;
  refund_amount?: number | null;
  refund_reason?: string | null;
  dispute_reason?: string | null;
  dispute_description?: string | null;
  dispute_status?: string | null;
  dispute_seller_response?: string | null;
  dispute_seller_photo_urls?: string[] | null;
  dispute_seller_responded_at?: string | null;
  dispute_seller_deadline?: string | null;
  dispute_photo_urls?: string[] | null;
  dispute_resolved_at?: string | null;
  dispute_resolution?: string | null;
  dispute_resolution_note?: string | null;
  payment_method?: string | null;
  refund_status?: string | null;
  refund_method?: string | null;
  payment?: {
    seller_wallet_credit_cents?: number | null;
    buyer_wallet_debit_cents?: number | null;
    everypay_payment_reference?: string | null;
    everypay_payment_state?: string | null;
    platform_commission_cents?: number | null;
    wallet_credited_at?: string | null;
  } | null;
  timestamps: {
    created_at: string;
    paid_at?: string | null;
    seller_responded_at?: string | null;
    label_generated_at?: string | null;
    disputed_at?: string | null;
    completed_at?: string | null;
    cancelled_at?: string | null;
    refunded_at?: string | null;
  };
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

interface OrderIssue {
  id: string;
  issue_type: string;
  description: string;
  photo_urls: string[];
  status: string;
  created_at: string;
  reporter_role: string;
}

interface StaffDisputeData {
  order: DisputeOrder;
  order_items: OrderDetailItem[];
  tracking_events: TrackingEvent[];
  issues: OrderIssue[];
  buyer: UserProfile | null;
  seller: UserProfile | null;
  seller_wallet_balance_cents: number | null;
}

function disputeStatusVariant(
  status: string | null | undefined
): 'default' | 'warning' | 'trust' | 'success' {
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
}

export default function StaffDisputeDetailPage() {
  const locale = useLocale();
  const params = useParams();
  const orderId = params.orderId as string;
  const { user } = useAuth();

  const [data, setData] = useState<StaffDisputeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/staff/transactions/${orderId}`);
      const result = await response.json();

      if (!response.ok)
        throw new Error(result.error || 'Failed to fetch order');

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dispute'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (user && orderId) fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is the stable dep
  }, [user?.id, orderId, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading dispute...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24">
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

  const { order, order_items, tracking_events, issues, buyer, seller, seller_wallet_balance_cents } = data;

  const isResolved = order.dispute_status === 'resolved';
  const isDisputed = order.status === 'disputed';


  return (
    <div className="pb-48">
      {/* Sub-header */}
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
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Created {formatDateTime(order.timestamps.created_at, locale)}
            {order.timestamps.disputed_at &&
              ` | Disputed ${formatDateTime(order.timestamps.disputed_at, locale)}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-6">
            <DisputeClaimCard
              reason={order.dispute_reason}
              description={order.dispute_description}
              photoUrls={order.dispute_photo_urls}
            />

            <DisputeSellerResponse
              response={order.dispute_seller_response}
              photoUrls={order.dispute_seller_photo_urls}
              respondedAt={order.dispute_seller_responded_at}
              deadline={order.dispute_seller_deadline}
            />

            {/* Prior Issues (from Report Issue flow) */}
            {issues && issues.length > 0 && (
              <div className="bg-snow-white border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-aurora-yellow" />
                  Prior Issues ({issues.length})
                </h3>
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div key={issue.id} className="border-b border-border-subtle last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" size="sm">
                          {issue.issue_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-text-muted capitalize">
                          {issue.reporter_role}
                        </span>
                        <Badge
                          variant={issue.status === 'resolved' ? 'success' : issue.status === 'investigating' ? 'warning' : 'error'}
                          size="sm"
                        >
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap mt-1">
                        {issue.description}
                      </p>
                      {issue.photo_urls && issue.photo_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {issue.photo_urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-frost-ice hover:underline"
                            >
                              Photo {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        {formatDateTime(issue.created_at, locale)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <OrderItemsList
              items={order_items}
              title={`Order Items (${order_items.length})`}
            />

            {/* Timeline */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                Timeline
              </h3>
              <div className="space-y-3">
                <TimelineEntry label="Order created" time={order.timestamps.created_at} />
                {order.timestamps.seller_responded_at && (
                  <TimelineEntry label="Accepted by seller" time={order.timestamps.seller_responded_at} />
                )}
                {order.timestamps.label_generated_at && (
                  <TimelineEntry label="Label generated" time={order.timestamps.label_generated_at} />
                )}
                {order.timestamps.disputed_at && (
                  <TimelineEntry label="Dispute opened" time={order.timestamps.disputed_at} highlight />
                )}
                {order.dispute_seller_responded_at && (
                  <TimelineEntry label="Seller responded to dispute" time={order.dispute_seller_responded_at} />
                )}
                {order.dispute_resolved_at && (
                  <TimelineEntry label="Dispute resolved" time={order.dispute_resolved_at} highlight />
                )}
                {order.timestamps.completed_at && (
                  <TimelineEntry label="Order completed" time={order.timestamps.completed_at} />
                )}
                {order.timestamps.cancelled_at && (
                  <TimelineEntry label="Order cancelled" time={order.timestamps.cancelled_at} />
                )}
                {order.timestamps.refunded_at && (
                  <TimelineEntry label="Refunded" time={order.timestamps.refunded_at} highlight />
                )}
              </div>
            </div>
          </div>

          {/* Right column - sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Info */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-3">Order Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Order number</span>
                  <span className="font-medium text-polar-night">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total</span>
                  <span className="font-medium text-polar-night">{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status</span>
                  <Badge
                    variant={
                      order.status === 'disputed' ? 'error'
                        : order.status === 'refunded' ? 'warning'
                          : order.status === 'completed' ? 'success'
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
                {seller_wallet_balance_cents != null && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Seller wallet</span>
                    <span className={`font-medium ${
                      order.payment?.seller_wallet_credit_cents &&
                      seller_wallet_balance_cents < order.payment.seller_wallet_credit_cents
                        ? 'text-aurora-red'
                        : 'text-aurora-green'
                    }`}>
                      {formatCentsToCurrency(seller_wallet_balance_cents)}
                    </span>
                  </div>
                )}
                {seller_wallet_balance_cents != null &&
                  order.payment?.seller_wallet_credit_cents &&
                  seller_wallet_balance_cents < order.payment.seller_wallet_credit_cents &&
                  order.dispute_status !== 'resolved' && (
                  <div className="p-2 rounded-lg bg-aurora-red/5 border border-aurora-red/20 text-xs text-aurora-red">
                    Seller wallet ({formatCentsToCurrency(seller_wallet_balance_cents)}) is less than credited amount ({formatCentsToCurrency(order.payment.seller_wallet_credit_cents)}). Full clawback will fail.
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
                    <span className="text-text-muted text-xs">Resolution note</span>
                    <p className="text-sm text-text-secondary mt-1">
                      {order.dispute_resolution_note}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4">Participants</h3>
              <div className="mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />BUYER
                </div>
                <p className="font-medium text-polar-night">{buyer?.full_name || 'Unknown'}</p>
                {buyer?.email && (
                  <p className="text-sm text-text-secondary mt-1">{buyer.email}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />SELLER
                </div>
                <p className="font-medium text-polar-night">{seller?.full_name || 'Unknown'}</p>
                {seller?.email && (
                  <p className="text-sm text-text-secondary mt-1">{seller.email}</p>
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
                        <p className="text-text-secondary">{event.description}</p>
                      )}
                      {event.event_timestamp && (
                        <p className="text-text-muted mt-0.5">
                          {formatDateTime(event.event_timestamp, locale)}
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
                <h3 className="text-sm font-semibold text-polar-night mb-3">Refund Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Status</span>
                    <Badge
                      variant={
                        order.refund_status === 'completed' ? 'success'
                          : order.refund_status === 'manual_sepa_required' ? 'warning'
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
                          {formatCentsToCurrency(order.payment.buyer_wallet_debit_cents)}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEPA Confirmation */}
      {order.refund_status === 'manual_sepa_required' && (
        <SepaConfirmationForm orderId={orderId} onConfirmed={fetchData} />
      )}

      {/* Resolution Form */}
      {isDisputed &&
        !isResolved &&
        order.refund_status !== 'manual_sepa_required' && (
          <DisputeResolutionForm
            orderId={orderId}
            defaultRefundAmountCents={Math.round(order.total_amount * 100)}
            onResolved={fetchData}
          />
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
  const locale = useLocale();
  return (
    <div
      className={`flex items-center justify-between text-sm py-1.5 ${
        highlight ? 'text-aurora-red font-medium' : 'text-text-secondary'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-text-muted">{formatDateTime(time, locale)}</span>
    </div>
  );
}
