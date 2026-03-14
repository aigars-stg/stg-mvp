'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import { ArrowUp, RefreshCw as Loader2, Shield, AlertCircle } from '@/lib/icons';
import { formatPrice } from '@/lib/services/pricing';

// IBAN format hints by country
const IBAN_HINTS: Record<string, string> = {
  LV: 'LV00 BANK 0000 0000 0000 0',
  LT: 'LT00 0000 0000 0000 0000',
  EE: 'EE00 0000 0000 0000 0000',
};

// Expected IBAN lengths for Baltic countries
const IBAN_LENGTHS: Record<string, number> = {
  LV: 21,
  LT: 20,
  EE: 20,
};

/**
 * Validate IBAN format and MOD97 check digit (ISO 7064)
 * Returns null if valid, error message string if invalid
 */
function validateIBAN(raw: string): string | null {
  const iban = raw.replace(/\s/g, '').toUpperCase();

  if (iban.length < 2) return 'ibanTooShort';

  // Must start with 2-letter country code + 2 digits
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return 'ibanInvalidFormat';

  // Total length: 15-34 characters
  if (iban.length < 15 || iban.length > 34) return 'ibanInvalidLength';

  // Check Baltic country-specific lengths
  const country = iban.substring(0, 2);
  const expectedLength = IBAN_LENGTHS[country];
  if (expectedLength && iban.length !== expectedLength) {
    return 'ibanWrongLength';
  }

  // MOD97 check (ISO 7064): move first 4 chars to end, convert letters to digits
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  const numericStr = rearranged
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      // A=10 ... Z=35
      return code >= 65 && code <= 90 ? (code - 55).toString() : ch;
    })
    .join('');

  // Compute mod 97 using chunked approach (handles large numbers)
  let remainder = 0;
  for (let i = 0; i < numericStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numericStr[i], 10)) % 97;
  }

  if (remainder !== 1) return 'ibanCheckDigit';

  return null;
}

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
  const t = useTranslations('WithdrawalForm');
  const [amountEuros, setAmountEuros] = useState('');
  const [iban, setIban] = useState(savedIban ? formatIBAN(savedIban) : '');
  const [accountHolderName, setAccountHolderName] = useState(savedName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ibanError, setIbanError] = useState<string | null>(null);

  const balanceEuros = balanceCents / 100;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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
    setIbanError(null);
    setError(null);
  };

  const ibanErrorMessage = (key: string): string => {
    const tKey = `errors.${key}` as Parameters<typeof t>[0];
    return t.has(tKey) ? t(tKey) : t('errors.generic');
  };

  const handleIBANBlur = () => {
    const cleaned = iban.replace(/\s/g, '');
    if (cleaned.length > 0) {
      const validationKey = validateIBAN(cleaned);
      setIbanError(validationKey ? ibanErrorMessage(validationKey) : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amountEuros || '0') * 100);

    if (amountCents <= 0) {
      setError(t('errors.amountRequired'));
      return;
    }

    if (amountCents > balanceCents) {
      setError(t('errors.exceedsBalance'));
      return;
    }

    const cleanedIban = iban.replace(/\s/g, '').trim();
    if (!cleanedIban) {
      setError(t('errors.ibanRequired'));
      return;
    }

    const ibanValidationKey = validateIBAN(cleanedIban);
    if (ibanValidationKey) {
      setIbanError(ibanErrorMessage(ibanValidationKey));
      return;
    }

    if (!accountHolderName.trim()) {
      setError(t('errors.nameRequired'));
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
        throw new Error(data.error || t('errors.generic'));
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const countryCode = iban.replace(/\s/g, '').substring(0, 2).toUpperCase();
  const hint = IBAN_HINTS[countryCode] || 'LV00 BANK 0000 0000 0000 0';
  const ibanIsSaved = savedIban && iban === formatIBAN(savedIban);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-polar-night mb-1">
          {t('amountLabel')}
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
            className="w-full pl-8 pr-4 py-3 rounded-lg border border-border bg-snow-white
                       text-polar-night placeholder:text-text-muted font-medium text-lg
                       focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                       transition-colors"
            disabled={loading}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-text-muted">
            {t('available', { amount: formatPrice(balanceEuros) })}
          </p>
          {balanceCents > 0 && (
            <button
              type="button"
              onClick={handleWithdrawAll}
              className="text-xs text-frost-ice hover:underline font-medium"
            >
              {t('withdrawAll')}
            </button>
          )}
        </div>
      </div>

      {/* Account Holder Name */}
      <div>
        <label htmlFor="holderName" className="block text-sm font-medium text-polar-night mb-1">
          {t('holderNameLabel')}
        </label>
        <input
          id="holderName"
          type="text"
          value={accountHolderName}
          onChange={(e) => {
            setAccountHolderName(e.target.value);
            setError(null);
          }}
          placeholder={t('holderNamePlaceholder')}
          className="w-full px-4 py-3 rounded-lg border border-border bg-snow-white
                     text-polar-night placeholder:text-text-muted
                     focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
                     transition-colors"
          disabled={loading}
        />
      </div>

      {/* IBAN */}
      <div>
        <label htmlFor="iban" className="flex items-center gap-2 text-sm font-medium text-polar-night mb-1">
          {t('ibanLabel')}
          {ibanIsSaved && (
            <span className="text-xs font-normal text-frost-ice bg-frost-ice/10 px-1.5 py-0.5 rounded">
              {t('savedBadge')}
            </span>
          )}
        </label>
        <input
          id="iban"
          type="text"
          value={iban}
          onChange={handleIBANChange}
          onBlur={handleIBANBlur}
          placeholder={hint}
          className={`w-full px-4 py-3 rounded-lg border bg-snow-white
                     text-polar-night placeholder:text-text-muted font-mono tracking-wide
                     focus:outline-none focus:ring-2 transition-colors uppercase ${
                       ibanError
                         ? 'border-aurora-red focus:border-aurora-red focus:ring-aurora-red/20'
                         : 'border-border focus:border-frost-ice focus:ring-frost-ice/20'
                     }`}
          disabled={loading}
          autoComplete="off"
        />
        {ibanError && (
          <p className="text-xs text-aurora-red mt-1">{ibanError}</p>
        )}
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
          disabled={loading || balanceCents === 0}
          className="flex-1"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ArrowUp className="w-4 h-4 mr-2" />
              {t('submit')}
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
