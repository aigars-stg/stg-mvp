export const LEGAL_SECTIONS = [
  { id: 'overview', label: 'Overview', labelKey: 'nav.overview', href: '/legal' },
  { id: 'terms', label: 'Terms of Service', labelKey: 'nav.terms', href: '/legal?section=terms' },
  { id: 'privacy', label: 'Privacy Policy', labelKey: 'nav.privacy', href: '/legal?section=privacy' },
  { id: 'seller', label: 'Seller Agreement', labelKey: 'nav.seller', href: '/legal?section=seller' },
  { id: 'buyer', label: 'Buyer Guide', labelKey: 'nav.buyer', href: '/legal?section=buyer' },
  { id: 'cookies', label: 'Cookie Policy', labelKey: 'nav.cookies', href: '/legal?section=cookies' },
  { id: 'fees', label: 'Fees', labelKey: 'nav.fees', href: '/legal?section=fees' },
] as const;

export type LegalSectionId = (typeof LEGAL_SECTIONS)[number]['id'];
