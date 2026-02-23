'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { Button, Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  AlertCircle,
  Shield,
  ArrowLeft,
  User,
  Phone,
  Email as Mail,
  Beaker as Flask,
  AlertTriangle,
  CheckCircleAlt01 as CheckCircle2,
} from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  issueTypeLabels,
  issueStatusConfig,
} from '@/components/shipping';
import type { TrackingEvent, OrderIssue } from '@/components/shipping';
import type { Message } from '@/lib/types/message';
import type { OrderDetailOrder, OrderDetailItem } from '@/lib/types/order-detail';
import {
  OrderDetailHeader,
  OrderStatusNotice,
  OrderItemsList,
  OrderPricingSummary,
  OrderTimeline,
  OrderShippingSection,
  ConversationPanel,
} from '@/components/order-detail';
import { formatDateTime } from '@/lib/date-utils';
import { formatPrice, formatCentsToCurrency } from '@/lib/services/pricing';

// --- Staff-specific types ---

type SimulationAction = 'label_printed' | 'set_barcode' | 'shipped' | 'in_transit' | 'delivered';

interface SimulationOption {
  action: SimulationAction;
  description: string;
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
  order: OrderDetailOrder;
  order_items: OrderDetailItem[];
  tracking_events: TrackingEvent[];
  issues: OrderIssue[];
  buyer: UserProfile | null;
  seller: UserProfile | null;
}

export default function StaffTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<StaffTransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  // Simulation state
  const [simulationOptions, setSimulationOptions] = useState<SimulationOption[]>([]);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirect=/staff/transactions/${orderId}`);
    }
  }, [user, authLoading, router, orderId]);

  const fetchTransaction = async () => {
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
      if (!response.ok) throw new Error(result.error || 'Failed to fetch transaction');

      setIsStaff(true);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulationOptions = useCallback(async () => {
    try {
      const response = await fetch(`/api/staff/orders/${orderId}/simulate-shipping`);
      if (response.ok) {
        const result = await response.json();
        setSimulationOptions(result.availableActions || []);
      }
    } catch (err) {
      console.error('Failed to fetch simulation options:', err);
    }
  }, [orderId]);

  const executeSimulation = async (action: SimulationAction) => {
    setSimulationLoading(true);
    setSimulationMessage(null);
    try {
      const response = await fetch(`/api/staff/orders/${orderId}/simulate-shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (response.ok) {
        setSimulationMessage({ type: 'success', text: result.message });
        await fetchTransaction();
        await fetchSimulationOptions();
      } else {
        setSimulationMessage({ type: 'error', text: result.error || 'Simulation failed' });
      }
    } catch {
      setSimulationMessage({ type: 'error', text: 'Failed to execute simulation' });
    } finally {
      setSimulationLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user && orderId) fetchTransaction(); }, [user, orderId]);

  useEffect(() => {
    if (data?.order?.shipping_method === 't2t' && isStaff) fetchSimulationOptions();
  }, [data?.order?.shipping_method, isStaff, fetchSimulationOptions]);

  if (isStaff === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-aurora-red mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">Staff Access Required</h1>
          <p className="text-text-secondary mb-6">This page is only accessible to staff members.</p>
          <Link href="/"><Button variant="accent">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">{error || 'Transaction not found'}</h2>
          <Link href="/staff/transactions"><Button variant="accent">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const { order, order_items, tracking_events, issues, buyer, seller, messages } = data;

  return (
    <div className="min-h-screen bg-bg-primary">
      <OrderDetailHeader
        orderNumber={order.order_number}
        status={order.status}
        subtitle={`Staff view • Created ${formatDateTime(order.timestamps.created_at)}`}
        backHref="/staff/transactions"
        backLabel="Back to Staff Dashboard"
        extraBadges={
          <>
            <Badge variant="default" size="sm">
              <Shield className="w-3 h-3 mr-1" />
              Staff
            </Badge>
            {issues.some((i) => i.status === 'open') && (
              <Badge variant="error" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Open Issues
              </Badge>
            )}
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <OrderPricingSummary order={order} viewerRole="staff" />

            {/* Participants (staff-specific: emails/phones) */}
            <div className="bg-snow-white border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-polar-night mb-4">Participants</h3>
              <div className="mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />BUYER
                </div>
                <p className="font-medium text-polar-night">{buyer?.full_name || 'Unknown'}</p>
                {buyer?.email && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Mail className="w-3 h-3" />{buyer.email}
                  </div>
                )}
                {buyer?.phone && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Phone className="w-3 h-3" />{buyer.phone}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <User className="w-3 h-3" />SELLER
                </div>
                <p className="font-medium text-polar-night">{seller?.full_name || 'Unknown'}</p>
                {seller?.email && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Mail className="w-3 h-3" />{seller.email}
                  </div>
                )}
                {seller?.phone && (
                  <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                    <Phone className="w-3 h-3" />{seller.phone}
                  </div>
                )}
              </div>
            </div>

            <OrderShippingSection
              order={order}
              trackingEvents={tracking_events}
              trackingMaxHeight="max-h-40"
            />

            {/* Shipping Simulation (Test Environment) */}
            {order.shipping_method === 't2t' && simulationOptions.length > 0 && (
              <div className="bg-aurora-purple/5 border border-aurora-purple/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3 flex items-center gap-2">
                  <Flask className="w-4 h-4 text-aurora-purple" />
                  Shipping Simulation
                  <Badge variant="warning" size="sm">Test Only</Badge>
                </h3>
                <p className="text-xs text-text-secondary mb-4">
                  Simulate shipping events for testing.
                </p>
                {simulationMessage && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${
                    simulationMessage.type === 'success'
                      ? 'bg-aurora-green/10 text-aurora-green border border-aurora-green/30'
                      : 'bg-aurora-red/10 text-aurora-red border border-aurora-red/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {simulationMessage.type === 'success'
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      {simulationMessage.text}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {simulationOptions.map((option) => (
                    <button
                      key={option.action}
                      onClick={() => executeSimulation(option.action)}
                      disabled={simulationLoading}
                      className="w-full flex items-center justify-between p-3 bg-snow-white border border-border rounded-lg hover:border-aurora-purple/50 hover:bg-aurora-purple/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-polar-night capitalize">
                          {option.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-text-secondary">{option.description}</p>
                      </div>
                      {simulationLoading
                        ? <Loader2 className="w-4 h-4 animate-spin text-aurora-purple" />
                        : <ArrowLeft className="w-4 h-4 text-aurora-purple rotate-180" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Info (staff-only) */}
            {order.payment && (order.payment.everypay_payment_reference || order.payment.buyer_wallet_debit_cents) && (
              <div className="bg-snow-white border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-3">Payment Info</h3>
                <div className="space-y-2 text-xs">
                  {order.payment.everypay_payment_reference && (
                    <div>
                      <span className="text-text-muted">EveryPay Reference:</span>
                      <p className="font-mono text-polar-night truncate">{order.payment.everypay_payment_reference}</p>
                    </div>
                  )}
                  {order.payment.everypay_payment_state && (
                    <div>
                      <span className="text-text-muted">Payment State:</span>
                      <p className="font-medium text-polar-night capitalize">{order.payment.everypay_payment_state}</p>
                    </div>
                  )}
                  {order.payment.buyer_wallet_debit_cents != null && order.payment.buyer_wallet_debit_cents > 0 && (
                    <div>
                      <span className="text-text-muted">Wallet Debit:</span>
                      <p className="font-medium text-polar-night">{formatCentsToCurrency(order.payment.buyer_wallet_debit_cents)}</p>
                    </div>
                  )}
                  {order.payment.platform_commission_cents != null && order.payment.platform_commission_cents > 0 && (
                    <div>
                      <span className="text-text-muted">Commission (10%):</span>
                      <p className="font-medium text-polar-night">{formatCentsToCurrency(order.payment.platform_commission_cents)}</p>
                    </div>
                  )}
                  {order.payment.seller_wallet_credit_cents != null && order.payment.seller_wallet_credit_cents > 0 && (
                    <div>
                      <span className="text-text-muted">Seller Credit:</span>
                      <p className="font-medium text-aurora-green">{formatCentsToCurrency(order.payment.seller_wallet_credit_cents)}</p>
                    </div>
                  )}
                  {order.payment.wallet_credited_at && (
                    <div>
                      <span className="text-text-muted">Credited At:</span>
                      <p className="text-polar-night">{formatDateTime(order.payment.wallet_credited_at)}</p>
                    </div>
                  )}
                  {order.refund_amount != null && order.refund_amount > 0 && (
                    <div>
                      <span className="text-text-muted">Refund Amount:</span>
                      <p className="font-medium text-aurora-red">{formatPrice(order.refund_amount)}</p>
                    </div>
                  )}
                  {order.refund_reason && (
                    <div>
                      <span className="text-text-muted">Refund Reason:</span>
                      <p className="text-polar-night">{order.refund_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <OrderStatusNotice order={order} viewerRole="staff" />

            {/* Issues (staff-only) */}
            {issues.length > 0 && (
              <div className="bg-snow-white border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-aurora-red" />
                  Issues ({issues.length})
                </h3>
                <div className="space-y-4">
                  {issues.map((issue) => {
                    const issueStatusInfo = issueStatusConfig[issue.status] || { label: issue.status, variant: 'default' as const };
                    return (
                      <div
                        key={issue.id}
                        className={`p-4 rounded-lg border ${
                          issue.status === 'open' || issue.status === 'investigating'
                            ? 'border-aurora-red/30 bg-aurora-red/5'
                            : 'border-border-subtle bg-bg-secondary'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-polar-night">
                                {issueTypeLabels[issue.issue_type] || issue.issue_type}
                              </span>
                              <Badge variant={issueStatusInfo.variant} size="sm">
                                {issueStatusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-text-muted mt-1">
                              Reported by {issue.reporter_role} • {formatDateTime(issue.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-text-secondary mt-2">{issue.description}</p>
                        {issue.photo_urls && issue.photo_urls.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {issue.photo_urls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative w-16 h-16 rounded overflow-hidden border border-border">
                                <Image src={url} alt={`Evidence ${idx + 1}`} fill className="object-cover" sizes="64px" />
                              </a>
                            ))}
                          </div>
                        )}
                        {issue.resolution_notes && (
                          <div className="mt-3 pt-3 border-t border-border-subtle">
                            <p className="text-xs text-text-muted">Resolution Notes:</p>
                            <p className="text-sm text-text-secondary">{issue.resolution_notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <OrderItemsList items={order_items} title={`Items (${order_items.length})`} />

            <ConversationPanel
              messages={messages}
              currentUserId={null}
              buyerId={data.conversation.buyer_id}
              readOnly
              title={`Conversation (${messages.length} messages)`}
            />

            <OrderTimeline timestamps={order.timestamps} />
          </div>
        </div>
      </div>
    </div>
  );
}
