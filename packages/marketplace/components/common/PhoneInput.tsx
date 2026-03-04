'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check, AlertCircle, Globe } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { COUNTRIES, type CountryCode } from '@/lib/country-utils';
import {
  PHONE_COUNTRY_CONFIGS,
  detectPhoneCountry,
  composePhoneNumber,
  isValidPhoneNumber,
  getPhonePrefix,
  type PhoneCountryCode,
} from '@/lib/phone-utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  defaultCountry?: CountryCode;
  compact?: boolean;
}

const BALTIC_COUNTRIES = COUNTRIES;

export function PhoneInput({
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  id = 'phone-input',
  defaultCountry = 'LV',
  compact = false,
}: PhoneInputProps) {
  const t = useTranslations('Common.PhoneInput');
  const tCountries = useTranslations('Countries');

  const [selectedCountry, setSelectedCountry] = useState<PhoneCountryCode>(() => {
    if (value) {
      return detectPhoneCountry(value).country;
    }
    return defaultCountry;
  });

  const [localNumber, setLocalNumber] = useState(() => {
    if (value) {
      return detectPhoneCountry(value).localNumber;
    }
    return '';
  });

  const [customPrefix, setCustomPrefix] = useState(() => {
    if (value) {
      const detected = detectPhoneCountry(value);
      if (detected.country === 'OTHER') {
        return detected.prefix;
      }
    }
    return '+';
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);

  // Validate the composed number
  useEffect(() => {
    const fullNumber = composePhoneNumber(selectedCountry, localNumber, customPrefix);
    if (fullNumber && fullNumber !== '+' && fullNumber.length > 1) {
      setIsValid(isValidPhoneNumber(fullNumber));
    } else {
      setIsValid(false);
    }
  }, [selectedCountry, localNumber, customPrefix]);

  // Sync from external value changes (e.g., profile prefill)
  useEffect(() => {
    const currentComposed = composePhoneNumber(selectedCountry, localNumber, customPrefix);
    if (value !== currentComposed) {
      const detected = detectPhoneCountry(value);
      setSelectedCountry(detected.country);
      setLocalNumber(detected.localNumber);
      if (detected.country === 'OTHER') {
        setCustomPrefix(detected.prefix || '+');
      }
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside to close dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isDropdownOpen]);

  const emitChange = useCallback(
    (country: PhoneCountryCode, local: string, prefix?: string) => {
      const fullNumber = composePhoneNumber(country, local, prefix);
      onChange(fullNumber);
    },
    [onChange]
  );

  const handleCountrySelect = (country: PhoneCountryCode) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);

    if (country !== 'OTHER') {
      setCustomPrefix('+');
      emitChange(country, localNumber);
    } else {
      emitChange(country, localNumber, customPrefix);
    }

    // Focus the local number input after selection
    setTimeout(() => localInputRef.current?.focus(), 0);
  };

  const handleLocalChange = (inputValue: string) => {
    const cleaned = inputValue.replace(/\D/g, '');
    setLocalNumber(cleaned);
    emitChange(selectedCountry, cleaned, customPrefix);
  };

  const handlePrefixChange = (inputValue: string) => {
    // Allow only + and digits, must start with +
    let cleaned = inputValue.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    setCustomPrefix(cleaned);
    emitChange(selectedCountry, localNumber, cleaned);
  };

  const currentPrefix =
    selectedCountry !== 'OTHER'
      ? getPhonePrefix(selectedCountry)
      : customPrefix;

  const currentFlagClass =
    selectedCountry !== 'OTHER'
      ? COUNTRIES.find(c => c.code === selectedCountry)?.flagClass || ''
      : 'fi fi-un';

  const currentConfig = PHONE_COUNTRY_CONFIGS.find(c => c.code === selectedCountry);

  const getStatusIcon = () => {
    const fullNumber = composePhoneNumber(selectedCountry, localNumber, customPrefix);
    if (!fullNumber || fullNumber === '+' || fullNumber.length <= 1) return null;
    if (isValid) {
      return <Check className="w-5 h-5 text-aurora-green" />;
    }
    return <AlertCircle className="w-5 h-5 text-aurora-red" />;
  };

  const borderClass = error
    ? 'border-aurora-red focus-within:border-aurora-red focus-within:ring-2 focus-within:ring-aurora-red/20'
    : isValid && localNumber
      ? 'border-aurora-green focus-within:border-aurora-green focus-within:ring-2 focus-within:ring-aurora-green/20'
      : 'border-border focus-within:border-frost-ice focus-within:ring-2 focus-within:ring-frost-ice/20';

  return (
    <div className="space-y-1.5">
      {!compact && (
        <label htmlFor={`${id}-local`} className="block text-sm font-medium text-polar-night">
          {t('label')} {required && <span className="text-aurora-red">*</span>}
        </label>
      )}

      <div className="relative">
        <div className={`flex rounded-lg border bg-bg-primary transition-all ${borderClass}`}>
          {/* Country selector button */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 min-h-[48px] border-r border-border bg-bg-secondary rounded-l-lg hover:bg-bg-elevated transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-label={t('dropdownLabel')}
          >
            <span className={`${currentFlagClass} text-lg`} role="img" aria-hidden="true" />
            {selectedCountry !== 'OTHER' && (
              <span className="text-sm font-medium text-polar-night">{currentPrefix}</span>
            )}
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Input area */}
          {selectedCountry !== 'OTHER' ? (
            // Baltic: single local number input
            <input
              ref={localInputRef}
              id={`${id}-local`}
              type="tel"
              value={localNumber}
              onChange={(e) => handleLocalChange(e.target.value)}
              placeholder={currentConfig?.localPlaceholder || ''}
              required={required}
              disabled={disabled}
              aria-required={required}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : !compact ? `${id}-hint` : undefined}
              className="flex-1 px-3 min-h-[48px] bg-transparent text-polar-night placeholder-text-muted outline-none text-sm min-w-0"
            />
          ) : (
            // Other: prefix input + local number input
            <>
              <input
                type="tel"
                value={customPrefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                placeholder="+49"
                disabled={disabled}
                aria-label={t('prefixLabel')}
                className="w-16 px-2 min-h-[48px] border-r border-border bg-transparent text-polar-night placeholder-text-muted outline-none text-sm text-center"
              />
              <input
                ref={localInputRef}
                id={`${id}-local`}
                type="tel"
                value={localNumber}
                onChange={(e) => handleLocalChange(e.target.value)}
                placeholder={t('otherPlaceholder')}
                required={required}
                disabled={disabled}
                aria-required={required}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : !compact ? `${id}-hint` : undefined}
                className="flex-1 px-3 min-h-[48px] bg-transparent text-polar-night placeholder-text-muted outline-none text-sm min-w-0"
              />
            </>
          )}

          {/* Validation icon */}
          <div className="flex items-center pr-3 flex-shrink-0" aria-hidden="true">
            {getStatusIcon()}
          </div>
        </div>

        {/* Dropdown panel */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-snow-white border border-border rounded-lg shadow-lg overflow-hidden"
            role="listbox"
            aria-label={t('dropdownLabel')}
          >
            {BALTIC_COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={selectedCountry === country.code}
                onClick={() => handleCountrySelect(country.code)}
                className={`flex items-center gap-3 w-full px-4 py-3 min-h-[48px] transition-colors text-left ${
                  selectedCountry === country.code
                    ? 'bg-frost-ice/10'
                    : 'hover:bg-bg-secondary'
                }`}
              >
                <span className={`${country.flagClass} text-lg`} role="img" aria-hidden="true" />
                <span className="text-sm font-medium text-polar-night">
                  {tCountries(country.code)}
                </span>
                <span className="text-sm text-text-muted ml-auto">
                  {getPhonePrefix(country.code)}
                </span>
                {selectedCountry === country.code && (
                  <Check className="w-4 h-4 text-frost-ice flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-border" />
            <button
              type="button"
              role="option"
              aria-selected={selectedCountry === 'OTHER'}
              onClick={() => handleCountrySelect('OTHER')}
              className={`flex items-center gap-3 w-full px-4 py-3 min-h-[48px] transition-colors text-left ${
                selectedCountry === 'OTHER'
                  ? 'bg-frost-ice/10'
                  : 'hover:bg-bg-secondary'
              }`}
            >
              <Globe className="w-5 h-5 text-text-muted" />
              <span className="text-sm font-medium text-polar-night">
                {tCountries('OTHER')}
              </span>
              {selectedCountry === 'OTHER' && (
                <Check className="w-4 h-4 text-frost-ice flex-shrink-0 ml-auto" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Format hint */}
      {!compact && !error && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {selectedCountry !== 'OTHER'
            ? t(`formatHint.${selectedCountry}`)
            : t('formatHint.OTHER')
          }
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-aurora-red flex items-center gap-1" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
