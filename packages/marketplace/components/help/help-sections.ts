export const HELP_SECTIONS = [
  { id: 'overview', label: 'Help Centre', labelKey: 'nav.overview', href: '/help' },
  { id: 'buying', label: 'How to Buy', labelKey: 'nav.buying', href: '/help/buying' },
  { id: 'selling', label: 'How to Sell', labelKey: 'nav.selling', href: '/help/selling' },
  { id: 'grading', label: 'Condition Grading', labelKey: 'nav.grading', href: '/help/grading' },
  { id: 'shipping', label: 'Shipping', labelKey: 'nav.shipping', href: '/help/shipping' },
  { id: 'wallet', label: 'Wallet & Payments', labelKey: 'nav.wallet', href: '/help/wallet' },
  { id: 'dac7', label: 'DAC7 & Taxes', labelKey: 'nav.dac7', href: '/help/dac7' },
] as const;

export type HelpSectionId = (typeof HELP_SECTIONS)[number]['id'];
