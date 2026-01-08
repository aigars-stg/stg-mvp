'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@second-turn/design-system';
import { ShoppingBag, ArrowDownRight, RefreshCw as Loader2, AlertCircle, CheckCircleAlt01 as CheckCircle2, Time as Clock, ChevronRight } from 'griddy-icons';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'sale' | 'payout';
  reference: string;
  status: string;
  payoutStatus?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface TransactionListProps {
  limit?: number;
  showViewAll?: boolean;
}

export function TransactionList({ limit = 10, showViewAll = true }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/seller/transactions?limit=${limit}&type=sale`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch transactions');
        }

        setTransactions(data.transactions);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
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

  const getStatusIcon = (status: string, payoutStatus?: string) => {
    if (status === 'completed' && payoutStatus === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-aurora-green" />;
    }
    if (status === 'completed' && payoutStatus === 'pending') {
      return <Clock className="w-4 h-4 text-aurora-yellow" />;
    }
    if (status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-aurora-green" />;
    }
    return <Clock className="w-4 h-4 text-text-muted" />;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-polar-night mb-4">Recent Sales</h3>
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
        <h3 className="text-lg font-semibold text-polar-night mb-4">Recent Sales</h3>
        <div className="flex items-center gap-2 text-aurora-red">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-polar-night mb-4">Recent Sales</h3>
        <div className="text-center py-4">
          <p className="text-text-secondary">No sales yet</p>
          <p className="text-sm text-text-muted">
            Your sales will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-polar-night">Recent Sales</h3>
        {showViewAll && total > limit && (
          <Link
            href="/seller/transactions"
            className="text-sm text-frost-ice hover:text-frost-ice/80 transition-colors flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg hover:bg-bg-elevated/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-frost-ice/10 flex items-center justify-center">
                {tx.type === 'sale' ? (
                  <ShoppingBag className="w-4 h-4 text-frost-ice" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-frost-ice" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-polar-night truncate max-w-[150px] sm:max-w-[200px]">
                  {tx.description || 'Game sale'}
                </p>
                <p className="text-xs text-text-muted">
                  {formatDate(tx.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-text-muted">
                  {formatCurrency(tx.grossAmount)}
                </p>
                <p className="text-sm font-semibold text-aurora-green">
                  {formatCurrency(tx.netAmount)} net
                </p>
              </div>
              {getStatusIcon(tx.status, tx.payoutStatus)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
