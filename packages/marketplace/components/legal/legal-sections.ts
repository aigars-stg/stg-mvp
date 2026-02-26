export const LEGAL_SECTIONS = [
  { id: 'overview', label: 'Overview', labelKey: 'nav.overview', href: '/legal' },
  { id: 'terms', label: 'Terms of Service', labelKey: 'nav.terms', href: '/legal/terms' },
  { id: 'privacy', label: 'Privacy Policy', labelKey: 'nav.privacy', href: '/legal/privacy' },
  { id: 'seller', label: 'Seller Agreement', labelKey: 'nav.seller', href: '/legal/seller' },
  { id: 'cookies', label: 'Cookie Policy', labelKey: 'nav.cookies', href: '/legal/cookies' },
  { id: 'fees', label: 'Fees', labelKey: 'nav.fees', href: '/legal/fees' },
] as const;

export type LegalSectionId = (typeof LEGAL_SECTIONS)[number]['id'];
