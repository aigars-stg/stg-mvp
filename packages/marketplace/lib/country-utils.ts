/**
 * Country utilities for marketplace
 * Supporting Latvia, Estonia, Lithuania, and Other countries
 * Uses flag-icons library for proper SVG flag rendering
 */

export type CountryCode = 'LV' | 'EE' | 'LT' | 'OTHER';

export interface Country {
  code: CountryCode;
  name: string;
  flagClass: string; // CSS class for flag-icons library
}

/**
 * Supported countries for the marketplace
 * LV = Latvia, EE = Estonia, LT = Lithuania, OTHER = Other countries
 */
export const COUNTRIES: Country[] = [
  { code: 'LV', name: 'Latvia', flagClass: 'fi fi-lv' },
  { code: 'EE', name: 'Estonia', flagClass: 'fi fi-ee' },
  { code: 'LT', name: 'Lithuania', flagClass: 'fi fi-lt' },
  { code: 'OTHER', name: 'Other', flagClass: 'fi fi-un' },
];

/**
 * Get country flag CSS class for a given country code
 * @param countryCode - Country code (LV, EE, LT, OTHER)
 * @returns Flag icon CSS class or empty string if not found
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country?.flagClass || '';
}

/**
 * Get country name for a given country code
 * @param countryCode - Country code (LV, EE, LT, OTHER)
 * @returns Country name or 'Unknown' if not found
 */
export function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) return 'Unknown';
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country?.name || 'Unknown';
}

/**
 * Get full country object for a given country code
 * @param countryCode - Country code (LV, EE, LT, OTHER)
 * @returns Country object or undefined if not found
 */
export function getCountry(countryCode: string | null | undefined): Country | undefined {
  if (!countryCode) return undefined;
  return COUNTRIES.find(c => c.code === countryCode);
}

/**
 * Check if a country code is valid
 * @param countryCode - Country code to validate
 * @returns true if valid country code
 */
export function isValidCountryCode(countryCode: string): countryCode is CountryCode {
  return COUNTRIES.some(c => c.code === countryCode);
}
