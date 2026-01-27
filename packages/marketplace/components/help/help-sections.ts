export const HELP_SECTIONS = [
  { id: 'overview', label: 'Help Centre', href: '/help' },
  { id: 'selling', label: 'How to Sell', href: '/help?section=selling' },
  { id: 'grading', label: 'Condition Grading', href: '/help?section=grading' },
  { id: 'shipping', label: 'Shipping', href: '/help?section=shipping' },
  { id: 'dac7', label: 'DAC7 & Taxes', href: '/help?section=dac7' },
] as const;

export type HelpSectionId = (typeof HELP_SECTIONS)[number]['id'];
