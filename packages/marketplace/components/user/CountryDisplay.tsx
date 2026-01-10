'use client';

import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { cn } from '@/lib/utils';

export type CountryDisplayMode = 'flag' | 'full' | 'none';

interface CountryDisplayProps {
  /** Country code (e.g., 'LV', 'EE', 'LT') */
  countryCode: string | null | undefined;
  /** Display mode: 'flag' (icon only), 'full' (flag + name), 'none' (hidden) */
  mode?: CountryDisplayMode;
  /** Additional className */
  className?: string;
}

/**
 * Displays country flag icon and optionally the country name.
 * Renders nothing when countryCode is null/undefined or mode is 'none'.
 */
export function CountryDisplay({
  countryCode,
  mode = 'flag',
  className,
}: CountryDisplayProps) {
  // Don't render anything if no country or mode is 'none'
  if (!countryCode || mode === 'none') {
    return null;
  }

  const flagClass = getCountryFlag(countryCode);
  const countryName = getCountryName(countryCode);

  // If we can't find a flag class, don't render
  if (!flagClass) {
    return null;
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-slate-600', className)}
      title={countryName}
    >
      <span className={cn(flagClass, 'fis')} aria-hidden="true" />
      {mode === 'full' && (
        <span className="text-sm">{countryName}</span>
      )}
    </span>
  );
}
