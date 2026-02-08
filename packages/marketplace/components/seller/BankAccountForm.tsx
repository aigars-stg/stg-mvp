'use client';

import { useState } from 'react';
import { Button } from '@second-turn/design-system';
import { CreditCard, RefreshCw as Loader2, Shield, AlertCircle } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface BankAccountFormProps {
  onSuccess: (bankAccount: { last4: string; bankName: string }) => void;
  onCancel: () => void;
  defaultName?: string;
}

// IBAN format hints by country
const IBAN_HINTS: Record<string, string> = {
  LV: 'LV00 BANK 0000 0000 0000 0',
  LT: 'LT00 0000 0000 0000 0000',
  EE: 'EE00 0000 0000 0000 0000',
};

export function BankAccountForm({ onSuccess, onCancel, defaultName }: BankAccountFormProps) {
  const t = useTranslations('BankAccountForm');
  const [iban, setIban] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(defaultName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format IBAN with spaces for readability
  const formatIBAN = (value: string): string => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const handleIBANChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIBAN(e.target.value);
    setIban(formatted);
    setError(null);
  };

  const getCountryCode = (): string | null => {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (cleaned.length >= 2) {
      const code = cleaned.substring(0, 2);
      if (['LV', 'LT', 'EE'].includes(code)) {
        return code;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!iban.trim()) {
      setError(t('ibanRequired'));
      return;
    }

    if (!accountHolderName.trim()) {
      setError(t('nameRequired'));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/seller/bank-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iban: iban.replace(/\s/g, ''), // Send without spaces
          accountHolderName: accountHolderName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add bank account');
      }

      onSuccess(data.bankAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  const countryCode = getCountryCode();
  const hint = countryCode ? IBAN_HINTS[countryCode] : 'LV00 BANK 0000 0000 0000 0';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Account Holder Name */}
      <div>
        <label
          htmlFor="accountHolderName"
          className="block text-sm font-medium text-polar-night mb-1"
        >
          {t('accountHolderName')}
        </label>
        <input
          id="accountHolderName"
          type="text"
          value={accountHolderName}
          onChange={(e) => {
            setAccountHolderName(e.target.value);
            setError(null);
          }}
          placeholder={t('namePlaceholder')}
          className="w-full px-4 py-3 rounded-lg border-2 border-border bg-snow-white
                     text-polar-night placeholder:text-text-muted
                     focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                     transition-colors"
          disabled={loading}
        />
      </div>

      {/* IBAN */}
      <div>
        <label
          htmlFor="iban"
          className="block text-sm font-medium text-polar-night mb-1"
        >
          {t('ibanLabel')}
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
        <p className="text-xs text-text-muted mt-1">
          {t('format')}: {hint}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
          <p className="text-sm text-aurora-red">{error}</p>
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-start gap-2 p-3 bg-frost-ice/5 rounded-lg">
        <Shield className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary">
          {t('securityNote')}
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
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('adding')}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {t('addBankAccount')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
