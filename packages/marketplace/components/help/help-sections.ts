export const HELP_SECTIONS = [
  { id: 'overview', label: 'Help Centre', labelKey: 'nav.overview', href: '/help' },
  { id: 'buying', label: 'How to Buy', labelKey: 'nav.buying', href: '/help?section=buying' },
  { id: 'selling', label: 'How to Sell', labelKey: 'nav.selling', href: '/help?section=selling' },
  { id: 'grading', label: 'Condition Grading', labelKey: 'nav.grading', href: '/help?section=grading' },
  { id: 'shipping', label: 'Shipping', labelKey: 'nav.shipping', href: '/help?section=shipping' },
  { id: 'wallet', label: 'Wallet & Payments', labelKey: 'nav.wallet', href: '/help?section=wallet' },
  { id: 'dac7', label: 'DAC7 & Taxes', labelKey: 'nav.dac7', href: '/help?section=dac7' },
] as const;

export type HelpSectionId = (typeof HELP_SECTIONS)[number]['id'];
