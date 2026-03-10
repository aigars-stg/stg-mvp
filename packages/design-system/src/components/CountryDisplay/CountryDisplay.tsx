import { clsx } from 'clsx';

export type CountryDisplayMode = 'flag' | 'full' | 'none';

// Baltic countries supported by the marketplace
const COUNTRIES: Record<string, { name: string; flag: string }> = {
  LV: { name: 'Latvia', flag: '🇱🇻' },
  EE: { name: 'Estonia', flag: '🇪🇪' },
  LT: { name: 'Lithuania', flag: '🇱🇹' },
};

export interface CountryDisplayProps {
  /** Country code (e.g., 'LV', 'EE', 'LT') */
  countryCode: string | null | undefined;
  /** Display mode: 'flag' (emoji only), 'full' (flag + name), 'none' (hidden) */
  mode?: CountryDisplayMode;
  className?: string;
}

/**
 * Displays country flag emoji and optionally the country name.
 * Renders nothing when countryCode is null/undefined or mode is 'none'.
 */
export function CountryDisplay({
  countryCode,
  mode = 'flag',
  className,
}: CountryDisplayProps) {
  if (!countryCode || mode === 'none') return null;

  const country = COUNTRIES[countryCode.toUpperCase()];
  if (!country) return null;

  return (
    <span
      className={clsx('inline-flex items-center gap-1 text-text-secondary', className)}
      title={country.name}
    >
      <span aria-hidden="true">{country.flag}</span>
      {mode === 'full' && <span className="text-sm">{country.name}</span>}
    </span>
  );
}
