'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import { CurrencyEuro as Euro, ArrowUp } from 'griddy-icons';
import { Link } from '@/i18n/navigation';
import { formatCentsToCurrency } from '@/lib/services/pricing';

interface WalletBalanceProps {
  /** Show a compact version (no withdraw button) */
  compact?: boolean;
  /** Show link to wallet page */
  showLink?: boolean;
}

export function WalletBalance({ compact = false, showLink = false }: WalletBalanceProps) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setBalanceCents(data.balanceCents);
      }
    } catch {
      // Silently fail — balance will show as loading
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-aurora-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Euro className="w-5 h-5 text-aurora-green" />
        </div>
        <div>
          <p className="text-xs text-text-secondary">Wallet balance</p>
          {loading ? (
            <div className="h-6 w-16 bg-bg-elevated rounded animate-pulse" />
          ) : (
            <p className="text-lg font-bold text-polar-night">
              {formatCentsToCurrency(balanceCents || 0)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-aurora-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Euro className="w-6 h-6 text-aurora-green" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Wallet balance</p>
            {loading ? (
              <div className="h-8 w-24 bg-bg-elevated rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-polar-night">
                {formatCentsToCurrency(balanceCents || 0)}
              </p>
            )}
          </div>
        </div>

        {!loading && (balanceCents || 0) > 0 && (
          <Link href="/seller/settings/payouts">
            <Button variant="primary" size="sm">
              <ArrowUp className="w-4 h-4 mr-1.5" />
              Withdraw
            </Button>
          </Link>
        )}
      </div>

      {showLink && (
        <Link
          href="/seller/settings/payouts"
          className="text-sm text-frost-ice hover:underline font-medium"
        >
          View wallet & transactions →
        </Link>
      )}

      {!loading && balanceCents === 0 && (
        <p className="text-xs text-text-muted mt-2">
          Earnings from completed sales will appear here
        </p>
      )}
    </div>
  );
}
