'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button, Badge } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  CurrencyEuro as Euro,
  AlertCircle,
  CheckCircleAlt01 as CheckCircle,
  Shield,
} from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDateTime } from '@/lib/date-utils';
import { formatCentsToCurrency } from '@/lib/services/pricing';

interface Withdrawal {
  id: string;
  userId: string;
  amountCents: number;
  iban: string;
  accountHolderName: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  bankReference: string | null;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
  sellerName: string;
  sellerEmail: string;
}

interface WithdrawalResponse {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    pendingCount: number;
    pendingTotalCents: number;
  };
}

const STATUS_BADGE: Record<string, 'warning' | 'default' | 'success' | 'error'> = {
  pending: 'warning',
  processing: 'default',
  completed: 'success',
  rejected: 'error',
};

function WithdrawalsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<WithdrawalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal state
  const [actionModal, setActionModal] = useState<{
    withdrawal: Withdrawal;
    action: 'complete' | 'reject';
  } | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/staff/withdrawals');
    }
  }, [user, authLoading, router]);

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/withdrawals?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user) fetchWithdrawals();
  }, [user, fetchWithdrawals]);

  const handleAction = async () => {
    if (!actionModal) return;
    setActionError(null);

    const { withdrawal, action } = actionModal;

    if (action === 'complete' && !bankReference.trim()) {
      setActionError('Bank reference is required');
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      setActionError('Rejection reason is required');
      return;
    }

    try {
      setProcessingId(withdrawal.id);
      const res = await fetch('/api/staff/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId: withdrawal.id,
          action,
          bankReference: action === 'complete' ? bankReference.trim() : undefined,
          rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process withdrawal');
      }

      setActionModal(null);
      setBankReference('');
      setRejectionReason('');
      fetchWithdrawals();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessingId(null);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
            <Shield className="w-3.5 h-3.5" />
            Staff Dashboard
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Euro className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
              Withdrawal Management
            </h1>
          </div>
          <p className="text-text-secondary">
            Review and process seller withdrawal requests
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Summary */}
        {data?.summary && data.summary.pendingCount > 0 && (
          <div className="bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0" />
            <div>
              <p className="font-medium text-polar-night">
                {data.summary.pendingCount} pending withdrawal{data.summary.pendingCount !== 1 ? 's' : ''} totalling{' '}
                {formatCentsToCurrency(data.summary.pendingTotalCents)}
              </p>
              <p className="text-xs text-text-secondary">
                Process these via bank transfer and mark as completed
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['pending', 'completed', 'rejected', 'all'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchWithdrawals}
            disabled={loading}
            className="ml-auto"
          >
            <Loader2 className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-snow-white border border-border rounded-lg p-4 animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-5 w-32 bg-bg-elevated rounded" />
                  <div className="h-5 w-20 bg-bg-elevated rounded-full" />
                </div>
                <div className="h-4 w-48 bg-bg-elevated rounded" />
              </div>
            ))}
          </div>
        ) : data?.withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-aurora-green mx-auto mb-3" />
            <p className="text-text-secondary">
              {statusFilter === 'pending'
                ? 'No pending withdrawals'
                : `No ${statusFilter} withdrawals`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.withdrawals.map((w) => (
              <div
                key={w.id}
                className="bg-snow-white border border-border rounded-lg p-4 sm:p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-polar-night">
                      {formatCentsToCurrency(w.amountCents)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {w.sellerName} ({w.sellerEmail})
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[w.status] || 'default'}>
                    {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-text-secondary mb-3">
                  <div>
                    <span className="text-text-muted">To: </span>
                    <span className="font-mono text-polar-night">{w.iban}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Name: </span>
                    <span>{w.accountHolderName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Requested: </span>
                    <span>{formatDateTime(w.createdAt)}</span>
                  </div>
                </div>

                {w.bankReference && (
                  <p className="text-xs text-text-muted mb-2">
                    Bank ref: {w.bankReference}
                  </p>
                )}

                {w.rejectionReason && (
                  <p className="text-xs text-aurora-red mb-2">
                    Rejected: {w.rejectionReason}
                  </p>
                )}

                {w.status === 'pending' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setActionModal({ withdrawal: w, action: 'complete' });
                        setBankReference('');
                        setActionError(null);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Mark Completed
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActionModal({ withdrawal: w, action: 'reject' });
                        setRejectionReason('');
                        setActionError(null);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setActionModal(null)}
          />
          <div className="relative bg-snow-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-polar-night mb-2">
              {actionModal.action === 'complete'
                ? 'Complete Withdrawal'
                : 'Reject Withdrawal'}
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              {actionModal.action === 'complete'
                ? `Mark ${formatCentsToCurrency(actionModal.withdrawal.amountCents)} to ${actionModal.withdrawal.accountHolderName} as transferred.`
                : `Reject ${formatCentsToCurrency(actionModal.withdrawal.amountCents)} withdrawal. Amount will be refunded to seller's wallet.`}
            </p>

            {actionModal.action === 'complete' ? (
              <div className="mb-4">
                <label
                  htmlFor="bankRef"
                  className="block text-sm font-medium text-polar-night mb-1"
                >
                  Bank transfer reference
                </label>
                <input
                  id="bankRef"
                  type="text"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="e.g. TRF-2026-001234"
                  className="w-full px-4 py-3 rounded-lg border-2 border-border bg-snow-white
                             text-polar-night placeholder:text-text-muted
                             focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                             transition-colors"
                  autoFocus
                />
              </div>
            ) : (
              <div className="mb-4">
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-polar-night mb-1"
                >
                  Rejection reason
                </label>
                <textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this withdrawal is being rejected..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-border bg-snow-white
                             text-polar-night placeholder:text-text-muted
                             focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                             transition-colors resize-none"
                  autoFocus
                />
              </div>
            )}

            {actionError && (
              <div className="flex items-start gap-2 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-aurora-red">{actionError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setActionModal(null)}
                disabled={!!processingId}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={actionModal.action === 'complete' ? 'accent' : 'primary'}
                onClick={handleAction}
                disabled={!!processingId}
                className="flex-1"
              >
                {processingId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : actionModal.action === 'complete' ? (
                  'Confirm Completed'
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffWithdrawalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
        </div>
      }
    >
      <WithdrawalsContent />
    </Suspense>
  );
}
