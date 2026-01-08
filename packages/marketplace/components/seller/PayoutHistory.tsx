'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@second-turn/design-system';
import { Time as Clock, CheckCircleAlt01 as CheckCircle2, CloseCircle as XCircle, ArrowDownRight, RefreshCw as Loader2, AlertCircle } from 'griddy-icons';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  bankLast4: string | null;
  bankName: string | null;
  arrivalDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PayoutHistoryProps {
  limit?: number;
  showViewAll?: boolean;
}

export function PayoutHistory({ limit = 5, showViewAll = true }: PayoutHistoryProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/seller/payouts?limit=${limit}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch payouts');
        }

        setPayouts(data.payouts);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payouts');
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [limit]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-EU', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in_transit':
        return (
          <Badge variant="trust">
            <Clock className="w-3 h-3 mr-1" />
            In Transit
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
      case 'canceled':
        return (
          <Badge variant="error">
            <XCircle className="w-3 h-3 mr-1" />
            {status === 'failed' ? 'Failed' : 'Canceled'}
          </Badge>
        );
      default:
        return (
          <Badge variant="default">
            {status}
          </Badge>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-polar-night mb-4">Recent Payouts</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-frost-ice" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-polar-night mb-4">Recent Payouts</h3>
        <div className="flex items-center gap-2 text-aurora-red">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (payouts.length === 0) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-polar-night mb-4">Recent Payouts</h3>
        <div className="text-center py-4">
          <p className="text-text-secondary">No payouts yet</p>
          <p className="text-sm text-text-muted">
            Request your first payout when you have balance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-polar-night">Recent Payouts</h3>
        {showViewAll && total > limit && (
          <button className="text-sm text-frost-ice hover:text-frost-ice/80 transition-colors">
            View All ({total})
          </button>
        )}
      </div>

      <div className="space-y-3">
        {payouts.map((payout) => (
          <div
            key={payout.id}
            className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-frost-ice" />
              </div>
              <div>
                <p className="text-sm font-medium text-polar-night">
                  Payout to ****{payout.bankLast4}
                </p>
                <p className="text-xs text-text-muted">
                  {formatDate(payout.createdAt)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-polar-night">
                {formatCurrency(payout.amount)}
              </p>
              <div className="mt-1">
                {getStatusBadge(payout.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
