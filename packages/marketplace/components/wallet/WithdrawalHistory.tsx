'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Badge, Button } from '@second-turn/design-system';
import { RefreshCw as Loader2, Download } from '@/lib/icons';
import { formatDateTime } from '@/lib/date-utils';
import { formatCentsToCurrency } from '@/lib/services/pricing';

interface Withdrawal {
  id: string;
  amountCents: number;
  iban: string;
  accountHolderName: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  bankReference: string | null;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

const STATUS_CONFIG: Record<
  Withdrawal['status'],
  { labelKey: string; variant: 'warning' | 'default' | 'success' | 'error' }
> = {
  pending: { labelKey: 'statuses.pending', variant: 'warning' },
  processing: { labelKey: 'statuses.processing', variant: 'default' },
  completed: { labelKey: 'statuses.completed', variant: 'success' },
  rejected: { labelKey: 'statuses.rejected', variant: 'error' },
};

export function WithdrawalHistory() {
  const t = useTranslations('WithdrawalHistory');
  const locale = useLocale();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchWithdrawals(0, 10);
  }, []);

  const fetchWithdrawals = async (offset: number, limit: number) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/wallet/withdraw?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setWithdrawals(data.withdrawals);
        } else {
          setWithdrawals((prev) => [...prev, ...data.withdrawals]);
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


  const maskIban = (iban: string) => {
    if (iban.length <= 8) return iban;
    return `${iban.substring(0, 4)} •••• ${iban.substring(iban.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
            <div className="flex justify-between mb-2">
              <div className="h-4 w-20 bg-bg-elevated rounded" />
              <div className="h-5 w-16 bg-bg-elevated rounded-full" />
            </div>
            <div className="h-3 w-32 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-text-secondary text-sm">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {withdrawals.map((w) => {
          const config = STATUS_CONFIG[w.status];

          return (
            <div
              key={w.id}
              className="p-4 border border-border rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-polar-night">
                  {formatCentsToCurrency(w.amountCents)}
                </p>
                <Badge variant={config.variant}>
                  {t(config.labelKey)}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{t('to', { iban: maskIban(w.iban) })}</span>
                <span>{formatDateTime(w.createdAt)}</span>
              </div>
              {w.status === 'completed' && w.bankReference && (
                <p className="text-xs text-text-muted mt-1">
                  {t('bankRef', { ref: w.bankReference })}
                </p>
              )}
              {w.status === 'completed' && (
                <Link
                  href={`/${locale}/seller/payouts/${w.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-polar-night"
                >
                  <Download className="h-3.5 w-3.5" />
                  View statement
                </Link>
              )}
              {w.status === 'rejected' && w.rejectionReason && (
                <p className="text-xs text-aurora-red mt-1">
                  {t('reason', { reason: w.rejectionReason })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {withdrawals.length < total && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchWithdrawals(withdrawals.length, 10)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                {t('loading')}
              </>
            ) : (
              t('showMore')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
