'use client';

import { useState, useEffect } from 'react';
import { Phone, AlertCircle, Check } from 'griddy-icons';
import { PHONE_FORMATS, type TerminalCountry } from '@/lib/unisend/types';
import { useTranslations } from 'next-intl';

interface PhoneInputProps {
  country: TerminalCountry;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function PhoneInput({
  country,
  value,
  onChange,
  error,
  required = false,
}: PhoneInputProps) {
  const t = useTranslations('Checkout.PhoneInput');
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const phoneFormat = PHONE_FORMATS[country];

  // Validate phone on change
  useEffect(() => {
    if (value) {
      setIsValid(phoneFormat.regex.test(value));
    } else {
      setIsValid(false);
    }
  }, [value, phoneFormat]);

  // Format helper - add prefix if missing
  const handleChange = (inputValue: string) => {
    // Remove any non-numeric characters except +
    let cleaned = inputValue.replace(/[^\d+]/g, '');

    // Ensure it starts with the correct prefix
    const prefixes: Record<TerminalCountry, string> = {
      LT: '+370',
      LV: '+371',
      EE: '+372',
    };

    const prefix = prefixes[country];

    // If user is typing and hasn't entered the prefix yet, help them
    if (cleaned && !cleaned.startsWith('+')) {
      // If they start typing numbers, add the prefix
      if (cleaned.length > 0 && cleaned[0] !== '+') {
        // Check if they're typing the country code without +
        if (cleaned.startsWith(prefix.slice(1))) {
          cleaned = '+' + cleaned;
        } else {
          cleaned = prefix + cleaned;
        }
      }
    }

    onChange(cleaned);
  };

  const getStatusIcon = () => {
    if (!value) return null;
    if (isValid) {
      return <Check className="w-5 h-5 text-aurora-green" />;
    }
    return <AlertCircle className="w-5 h-5 text-aurora-red" />;
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="receiver-phone" className="block text-sm font-medium text-polar-night">
        {t('label')} {required && <span className="text-aurora-red">*</span>}
      </label>

      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
        <input
          id="receiver-phone"
          type="tel"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={phoneFormat.placeholder}
          required={required}
          aria-required={required}
          className={`
            w-full pl-10 pr-10 py-3 sm:py-3.5 rounded-lg border bg-bg-primary text-polar-night
            placeholder-text-muted outline-none transition-all min-h-[48px]
            ${
              error
                ? 'border-aurora-red focus:border-aurora-red focus:ring-2 focus:ring-aurora-red/20'
                : isValid && value
                ? 'border-aurora-green focus:border-aurora-green focus:ring-2 focus:ring-aurora-green/20'
                : 'border-border focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20'
            }
          `}
          aria-invalid={!!error}
          aria-describedby={error ? 'phone-error' : 'phone-hint'}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          {getStatusIcon()}
        </div>
      </div>

      {/* Format hint */}
      {!error && (
        <p id="phone-hint" className="text-xs text-text-muted">
          {t('format', { example: phoneFormat.example })}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id="phone-error" className="text-sm text-aurora-red flex items-center gap-1" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Country-specific info */}
      <div className="text-xs text-text-muted mt-1">
        {t(`countryHint.${country}`)}
      </div>
    </div>
  );
}

// Validation helper for use outside the component
export function validatePhone(phone: string, country: TerminalCountry): boolean {
  const format = PHONE_FORMATS[country];
  return format.regex.test(phone);
}
