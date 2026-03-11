'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Badge, Skeleton } from '@second-turn/design-system';
import { RefreshCw as Loader2, Download } from '@/lib/icons';
import { Link } from '@/i18n/navigation';
import { formatDateShort, formatDate } from '@/lib/date-utils';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import { DATE_RANGE_PRESETS, formatDateForAPI, downloadCSV } from '@/lib/bookkeeping-utils';

interface Transaction {
  id: string;
  type: 'sale_credit' | 'purchase_debit' | 'withdrawal' | 'refund_credit';
  amountCents: number;
  balanceAfterCents: number;
  description: string | null;
  createdAt: string;
  orderId: string | null;
  orderNumber: string | null;
  listingTitle: string | null;
  withdrawalStatus: string | null;
}

const TYPE_LABEL_KEYS: Record<Transaction['type'], string> = {
  sale_credit: 'types.saleCredit',
  purchase_debit: 'types.purchaseDebit',
  withdrawal: 'types.withdrawal',
  refund_credit: 'types.refundCredit',
};

// English labels used in CSV export (locale-independent)
const CSV_TYPE_LABELS: Record<Transaction['type'], string> = {
  sale_credit: 'Sale earnings',
  purchase_debit: 'Purchase',
  withdrawal: 'Withdrawal',
  refund_credit: 'Refund',
};

const WITHDRAWAL_STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  processing: 'warning',
  completed: 'success',
  rejected: 'error',
};

const ALL_TIME_KEY = 'all_time';

interface WalletTransactionsProps {
  initialLimit?: number;
}

function buildUrl(offset: number, limit: number, rangeKey: string): string {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());
  if (rangeKey !== ALL_TIME_KEY) {
    const preset = DATE_RANGE_PRESETS.find((p) => p.key === rangeKey);
    if (preset) {
      const { start, end } = preset.getRange();
      params.set('dateFrom', formatDateForAPI(start));
      params.set('dateTo', formatDateForAPI(end));
    }
  }
  return `/api/wallet/transactions?${params}`;
}

function generateTransactionCSV(transactions: Transaction[]): string {
  const header = ['Date', 'Type', 'Description', 'Order #', 'Amount (EUR)', 'Balance After (EUR)'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const rows = transactions.map((tx) => {
    const isCredit = tx.type === 'sale_credit' || tx.type === 'refund_credit';
    const description = tx.listingTitle || tx.description || '';
    const orderNum = tx.orderNumber ? `#${tx.orderNumber}` : '';
    const sign = isCredit ? '+' : '-';
    const amount = `${sign}${(tx.amountCents / 100).toFixed(2)}`;
    const balance = (tx.balanceAfterCents / 100).toFixed(2);
    return [formatDate(tx.createdAt), CSV_TYPE_LABELS[tx.type], description, orderNum, amount, balance];
  });

  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export function WalletTransactions({ initialLimit = 10 }: WalletTransactionsProps) {
  const t = useTranslations('WalletTransactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState('this_month');

  const fetchTransactions = useCallback(async (offset: number, limit: number, rangeKey: string) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(buildUrl(offset, limit, rangeKey));
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
  }, []);

  useEffect(() => {
    fetchTransactions(0, initialLimit, dateRange);
  }, [dateRange, initialLimit, fetchTransactions]);

  const handleRangeChange = (key: string) => {
    setDateRange(key);
  };

  const handleLoadMore = () => {
    fetchTransactions(transactions.length, 20, dateRange);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(buildUrl(0, 1000, dateRange));
      if (res.ok) {
        const data = await res.json();
        const csv = generateTransactionCSV(data.transactions);
        const preset = DATE_RANGE_PRESETS.find((p) => p.key === dateRange);
        const periodLabel = preset
          ? preset.label.toLowerCase().replace(/\s+/g, '-')
          : 'all-time';
        const today = formatDateForAPI(new Date());
        downloadCSV(csv, `stg-transactions-${periodLabel}-${today}.csv`);
      }
    } catch {
      // Silently fail
    } finally {
      setExporting(false);
    }
  };

  // Filter toolbar
  const filterBar = (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <select
        value={dateRange}
        onChange={(e) => handleRangeChange(e.target.value)}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-snow-white text-polar-night focus:outline-none focus:ring-2 focus:ring-frost-ice/50"
      >
        <option value={ALL_TIME_KEY}>{t('filter.allTime')}</option>
        {DATE_RANGE_PRESETS.map((preset) => (
          <option key={preset.key} value={preset.key}>
            {t(`filter.${preset.key}`)}
          </option>
        ))}
      </select>

      {transactions.length > 0 && (
        <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-4 h-4 sm:mr-1.5 animate-spin" />
          ) : (
            <Download className="w-4 h-4 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">{t('exportCsv')}</span>
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <>
        {filterBar}
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide w-14">
                  {t('columns.date')}
                </th>
                <th className="hidden sm:table-cell text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t('columns.type')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {t('columns.description')}
                </th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide w-24">
                  {t('columns.amount')}
                </th>
                <th className="hidden sm:table-cell text-right px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide w-24">
                  {t('columns.balance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-10" /></td>
                  <td className="hidden sm:table-cell px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  <td className="hidden sm:table-cell px-3 py-3"><Skeleton className="h-3 w-12 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (transactions.length === 0) {
    return (
      <>
        {filterBar}
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm">{t('empty')}</p>
          <p className="text-text-muted text-xs mt-1">{t('emptyHint')}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {filterBar}
      <div className="overflow-x-auto min-w-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide w-14">
                {t('columns.date')}
              </th>
              <th className="hidden sm:table-cell text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t('columns.type')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t('columns.description')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide w-24">
                {t('columns.amount')}
              </th>
              <th className="hidden sm:table-cell text-right px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide w-24">
                {t('columns.balance')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'sale_credit' || tx.type === 'refund_credit';
              const labelKey = TYPE_LABEL_KEYS[tx.type];

              return (
                <tr key={tx.id} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-3 py-3 text-xs text-text-muted whitespace-nowrap">
                    {formatDateShort(tx.createdAt)}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-xs text-text-secondary whitespace-nowrap">
                    {t(labelKey)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-0.5">
                      {tx.listingTitle && (
                        <p className="text-xs text-polar-night truncate max-w-[200px]">
                          {tx.listingTitle}
                        </p>
                      )}
                      {!tx.listingTitle && tx.description && (
                        <p className="text-xs text-polar-night truncate max-w-[200px]">
                          {tx.description}
                        </p>
                      )}
                      {tx.orderId && tx.orderNumber && (
                        <Link
                          href={`/orders/${tx.orderId}`}
                          className="text-xs text-frost-ice hover:underline"
                        >
                          {tx.orderNumber}
                        </Link>
                      )}
                      {tx.type === 'withdrawal' && tx.withdrawalStatus && (
                        <Badge
                          variant={WITHDRAWAL_STATUS_VARIANT[tx.withdrawalStatus] ?? 'default'}
                          size="sm"
                        >
                          {t(`withdrawalStatus.${tx.withdrawalStatus}`)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-sm font-semibold text-right whitespace-nowrap ${isCredit ? 'text-aurora-green' : 'text-polar-night'}`}>
                    {isCredit ? '+' : '-'}{formatCentsToCurrency(tx.amountCents)}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-xs text-text-muted text-right whitespace-nowrap">
                    {formatCentsToCurrency(tx.balanceAfterCents)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {transactions.length < total && (
        <div className="mt-4 text-center">
          <Button variant="secondary" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                {t('loading')}
              </>
            ) : (
              t('showMore', { count: total - transactions.length })
            )}
          </Button>
        </div>
      )}
    </>
  );
}
