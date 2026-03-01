import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // Supported locales
  locales: ['en', 'lv'] as const,

  // Default locale (English for development, will be primary in production)
  defaultLocale: 'en',

  // Only show locale prefix when it's not the default
  // English: /listings → no prefix
  // Latvian: /lv/listings → with prefix
  localePrefix: 'as-needed',

  // Optionally enable locale detection (browser language)
  localeDetection: true,
});

// Export type for use throughout application
export type Locale = (typeof routing.locales)[number];

export const localeLabels: Record<Locale, { code: string; name: string }> = {
  en: { code: 'EN', name: 'English' },
  lv: { code: 'LV', name: 'Latviešu' },
  // Future: lt: { code: 'LT', name: 'Lietuvių' }, et: { code: 'ET', name: 'Eesti' }
};
