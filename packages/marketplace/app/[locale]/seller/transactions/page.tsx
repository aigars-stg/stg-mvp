'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Badge } from '@second-turn/design-system';
import { ArrowLeft, ShoppingBag, ArrowDownRight, RefreshCw as Loader2, AlertCircle, Filter } from 'griddy-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { formatDate } from '@/lib/date-utils';

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

type FilterType = 'all' | 'sale' | 'payout';

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchTransactions = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
      });

      if (filter !== 'all') {
        params.set('type', filter);
      }

      const response = await fetch(`/api/seller/transactions?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      if (append) {
        setTransactions(prev => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      setHasMore(data.pagination.hasMore);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin?redirect=/seller/transactions');
        return;
      }
      fetchTransactions(1);
    };

    checkAuth();
  }, [router, supabase, fetchTransactions]);

  useEffect(() => {
    setPage(1);
    fetchTransactions(1);
  }, [filter, fetchTransactions]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };


  const getStatusBadge = (status: string, payoutStatus?: string) => {
    if (status === 'completed' && payoutStatus === 'completed') {
      return <Badge variant="success">Paid Out</Badge>;
    }
    if (status === 'completed' && payoutStatus === 'pending') {
      return <Badge variant="warning">Pending Payout</Badge>;
    }
    if (status === 'completed') {
      return <Badge variant="success">Completed</Badge>;
    }
    if (status === 'paid') {
      return <Badge variant="success">Paid</Badge>;
    }
    if (status === 'in_transit') {
      return <Badge variant="trust">In Transit</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="error">Failed</Badge>;
    }
    return <Badge variant="default">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/seller/dashboard"
              className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-polar-night">Transaction History</h1>
              <p className="text-sm text-text-secondary">
                {total} total transactions
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-text-muted" />
          <div className="flex gap-2">
            {(['all', 'sale', 'payout'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === type
                    ? 'bg-frost-ice text-snow-white'
                    : 'bg-bg-elevated text-text-secondary hover:bg-bg-elevated/80'
                }`}
              >
                {type === 'all' ? 'All' : type === 'sale' ? 'Sales' : 'Payouts'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-snow-white border-2 border-border rounded-xl p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-frost-ice" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-snow-white border-2 border-border rounded-xl p-8">
            <div className="flex items-center gap-2 text-aurora-red justify-center">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-snow-white border-2 border-border rounded-xl p-8 text-center">
            <p className="text-text-secondary">No transactions found</p>
            <p className="text-sm text-text-muted mt-1">
              {filter !== 'all'
                ? `No ${filter === 'sale' ? 'sales' : 'payouts'} yet`
                : 'Your transactions will appear here'}
            </p>
          </div>
        ) : (
          <div className="bg-snow-white border-2 border-border rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg-elevated border-b border-border text-xs font-medium text-text-muted uppercase tracking-wide">
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Net</div>
              <div className="col-span-2 text-center">Status</div>
            </div>

            {/* Transactions */}
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-bg-elevated/50 transition-colors items-center"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'sale'
                        ? 'bg-frost-ice/10'
                        : 'bg-aurora-purple/10'
                    }`}>
                      {tx.type === 'sale' ? (
                        <ShoppingBag className="w-4 h-4 text-frost-ice" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-aurora-purple" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-polar-night truncate">
                        {tx.description || (tx.type === 'sale' ? 'Game sale' : 'Bank payout')}
                      </p>
                      <p className="text-xs text-text-muted">
                        {tx.reference}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-text-secondary">
                    {formatDate(tx.createdAt)}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm ${tx.type === 'payout' ? 'text-aurora-purple' : 'text-text-primary'}`}>
                      {tx.type === 'payout' ? '-' : ''}{formatCurrency(Math.abs(tx.grossAmount))}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-medium ${
                      tx.type === 'payout' ? 'text-aurora-purple' : 'text-aurora-green'
                    }`}>
                      {tx.type === 'payout' ? '-' : ''}{formatCurrency(Math.abs(tx.netAmount))}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {getStatusBadge(tx.status, tx.payoutStatus)}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-4 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
