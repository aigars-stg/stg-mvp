export const LEGAL_SECTIONS = [
  { id: 'overview', label: 'Overview', href: '/legal' },
  { id: 'terms', label: 'Terms of Service', href: '/legal?section=terms' },
  { id: 'privacy', label: 'Privacy Policy', href: '/legal?section=privacy' },
  { id: 'seller', label: 'Seller Agreement', href: '/legal?section=seller' },
  { id: 'buyer', label: 'Buyer Guide', href: '/legal?section=buyer' },
  { id: 'cookies', label: 'Cookie Policy', href: '/legal?section=cookies' },
  { id: 'fees', label: 'Fees', href: '/legal?section=fees' },
] as const;

export type LegalSectionId = (typeof LEGAL_SECTIONS)[number]['id'];
