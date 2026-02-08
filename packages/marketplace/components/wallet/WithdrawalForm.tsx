'use client';

import { useState } from 'react';
import { Button } from '@second-turn/design-system';
import { ArrowUp, RefreshCw as Loader2, Shield, AlertCircle } from 'griddy-icons';

// IBAN format hints by country
const IBAN_HINTS: Record<string, string> = {
  LV: 'LV00 BANK 0000 0000 0000 0',
  LT: 'LT00 0000 0000 0000 0000',
  EE: 'EE00 0000 0000 0000 0000',
};

interface WithdrawalFormProps {
  balanceCents: number;
  /** Pre-fill IBAN from seller profile */
  savedIban?: string;
  /** Pre-fill name from seller profile */
  savedName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WithdrawalForm({
  balanceCents,
  savedIban,
  savedName,
  onSuccess,
  onCancel,
}: WithdrawalFormProps) {
  const [amountEuros, setAmountEuros] = useState('');
  const [iban, setIban] = useState(savedIban ? formatIBAN(savedIban) : '');
  const [accountHolderName, setAccountHolderName] = useState(savedName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balanceEuros = balanceCents / 100;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only valid decimal input
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setAmountEuros(val);
      setError(null);
    }
  };

  const handleWithdrawAll = () => {
    setAmountEuros(balanceEuros.toFixed(2));
    setError(null);
  };

  const handleIBANChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIban(formatIBAN(e.target.value));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amountEuros || '0') * 100);

    if (amountCents <= 0) {
      setError('Please enter an amount');
      return;
    }

    if (amountCents > balanceCents) {
      setError('Amount exceeds your wallet balance');
      return;
    }

    if (!iban.replace(/\s/g, '').trim()) {
      setError('IBAN is required');
      return;
    }

    if (!accountHolderName.trim()) {
      setError('Account holder name is required');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          iban: iban.replace(/\s/g, ''),
          accountHolderName: accountHolderName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create withdrawal request');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const countryCode = iban.replace(/\s/g, '').substring(0, 2).toUpperCase();
  const hint = IBAN_HINTS[countryCode] || 'LV00 BANK 0000 0000 0000 0';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-polar-night mb-1">
          Withdrawal amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
            €
          </span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amountEuros}
            onChange={handleAmountChange}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-border bg-snow-white
                       text-polar-night placeholder:text-text-muted font-medium text-lg
                       focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                       transition-colors"
            disabled={loading}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-text-muted">
            Available: €{balanceEuros.toFixed(2)}
          </p>
          {balanceCents > 0 && (
            <button
              type="button"
              onClick={handleWithdrawAll}
              className="text-xs text-frost-ice hover:underline font-medium"
            >
              Withdraw all
            </button>
          )}
        </div>
      </div>

      {/* Account Holder Name */}
      <div>
        <label htmlFor="holderName" className="block text-sm font-medium text-polar-night mb-1">
          Account holder name
        </label>
        <input
          id="holderName"
          type="text"
          value={accountHolderName}
          onChange={(e) => {
            setAccountHolderName(e.target.value);
            setError(null);
          }}
          placeholder="Full name as on bank account"
          className="w-full px-4 py-3 rounded-lg border-2 border-border bg-snow-white
                     text-polar-night placeholder:text-text-muted
                     focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                     transition-colors"
          disabled={loading}
        />
      </div>

      {/* IBAN */}
      <div>
        <label htmlFor="iban" className="block text-sm font-medium text-polar-night mb-1">
          IBAN
        </label>
        <input
          id="iban"
          type="text"
          value={iban}
          onChange={handleIBANChange}
          placeholder={hint}
          className="w-full px-4 py-3 rounded-lg border-2 border-border bg-snow-white
                     text-polar-night placeholder:text-text-muted font-mono tracking-wide
                     focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                     transition-colors uppercase"
          disabled={loading}
          autoComplete="off"
        />
        <p className="text-xs text-text-muted mt-1">Format: {hint}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      )}

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 bg-frost-ice/5 rounded-lg">
        <Shield className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary">
          Withdrawals are processed manually via bank transfer within 1-3 business days.
          Your IBAN is stored securely for future withdrawals.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="accent"
          disabled={loading || balanceCents === 0}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <ArrowUp className="w-4 h-4 mr-2" />
              Request Withdrawal
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function formatIBAN(value: string): string {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}
