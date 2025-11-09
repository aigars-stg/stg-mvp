'use client';

import { COUNTRIES, type CountryCode } from '@/lib/country-utils';

interface CountrySelectorProps {
  value: string;
  onChange: (value: CountryCode) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function CountrySelector({
  value,
  onChange,
  disabled = false,
  required = false,
  error
}: CountrySelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {COUNTRIES.map((country) => (
          <button
            key={country.code}
            type="button"
            onClick={() => onChange(country.code)}
            disabled={disabled}
            aria-label={`Select ${country.name}`}
            aria-pressed={value === country.code}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
              ${value === country.code
                ? 'border-frost-ice bg-frost-ice/10 ring-2 ring-frost-ice/20'
                : 'border-border hover:border-frost-ice/50 hover:bg-bg-secondary'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-frost-ice/30
            `}
          >
            <span className={`${country.flagClass} text-2xl`} role="img" aria-label={`${country.name} flag`} />
            <span className="text-sm font-medium text-polar-night">
              {country.name}
            </span>
            {value === country.code && (
              <svg
                className="ml-auto w-5 h-5 text-frost-ice flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-aurora-red" role="alert">
          {error}
        </p>
      )}
      {required && !value && (
        <p className="mt-2 text-xs text-text-secondary">
          * Required field
        </p>
      )}
    </div>
  );
}
