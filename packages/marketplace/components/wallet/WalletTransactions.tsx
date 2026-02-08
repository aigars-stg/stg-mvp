'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import {
  ArrowDown,
  ArrowUp,
  RefreshCw as Loader2,
  ShoppingBag,
  Package,
} from 'griddy-icons';
import { formatDateTime } from '@/lib/date-utils';

interface Transaction {
  id: string;
  type: 'sale_credit' | 'purchase_debit' | 'withdrawal' | 'refund_credit';
  amountCents: number;
  balanceAfterCents: number;
  description: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  Transaction['type'],
  { label: string; color: string; icon: typeof ArrowDown; sign: '+' | '-' }
> = {
  sale_credit: { label: 'Sale earnings', color: 'text-aurora-green', icon: ArrowDown, sign: '+' },
  purchase_debit: { label: 'Purchase', color: 'text-aurora-red', icon: ShoppingBag, sign: '-' },
  withdrawal: { label: 'Withdrawal', color: 'text-aurora-red', icon: ArrowUp, sign: '-' },
  refund_credit: { label: 'Refund', color: 'text-frost-ice', icon: Package, sign: '+' },
};

interface WalletTransactionsProps {
  /** Max number of transactions to show initially */
  initialLimit?: number;
}

export function WalletTransactions({ initialLimit = 10 }: WalletTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchTransactions(0, initialLimit);
  }, [initialLimit]);

  const fetchTransactions = async (offset: number, limit: number) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/wallet/transactions?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }
        setTotal(data.total);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchTransactions(transactions.length, 20);
  };

  const formatCents = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-10 h-10 bg-bg-elevated rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-bg-elevated rounded mb-1" />
              <div className="h-3 w-32 bg-bg-elevated rounded" />
            </div>
            <div className="h-5 w-16 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary text-sm">No transactions yet</p>
        <p className="text-text-muted text-xs mt-1">
          Earnings from completed sales will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {transactions.map((tx) => {
          const config = TYPE_CONFIG[tx.type];
          const Icon = config.icon;
          const isCredit = config.sign === '+';

          return (
            <div key={tx.id} className="flex items-center gap-3 py-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCredit ? 'bg-aurora-green/10' : 'bg-bg-elevated'
                }`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-polar-night">
                  {tx.description || config.label}
                </p>
                <p className="text-xs text-text-muted">
                  {formatDateTime(tx.createdAt)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`text-sm font-semibold ${
                    isCredit ? 'text-aurora-green' : 'text-polar-night'
                  }`}
                >
                  {config.sign}{formatCents(tx.amountCents)}
                </p>
                <p className="text-xs text-text-muted">
                  bal. {formatCents(tx.balanceAfterCents)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {transactions.length < total && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Loading...
              </>
            ) : (
              `Show more (${total - transactions.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
