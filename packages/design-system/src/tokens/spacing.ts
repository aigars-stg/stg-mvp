// 8-point grid system for Nordic consistency and scalability
export const spacing = {
  // Base scale using 4px and 8px increments
  0: '0',
  1: '0.25rem',    // 4px - tight spacing between closely related items
  2: '0.5rem',     // 8px - standard internal spacing
  3: '0.75rem',    // 12px - comfortable internal spacing
  4: '1rem',       // 16px - standard padding inside cards
  5: '1.25rem',    // 20px - comfortable padding
  6: '1.5rem',     // 24px - gaps between cards
  8: '2rem',       // 32px - section spacing
  10: '2.5rem',    // 40px - large section spacing
  12: '3rem',      // 48px - major page sections
  16: '4rem',      // 64px - page-level spacing
  20: '5rem',      // 80px - hero sections
  24: '6rem',      // 96px - maximum spacing
} as const;

// Semantic spacing for specific use cases
export const semanticSpacing = {
  // Card and container spacing
  cardPadding: spacing[4],           // 16px
  cardPaddingSmall: spacing[3],      // 12px
  cardGap: spacing[6],               // 24px between cards

  // Section spacing
  sectionGap: spacing[12],           // 48px between major sections
  sectionGapSmall: spacing[8],       // 32px for related sections

  // Component internal spacing
  buttonPaddingX: spacing[4],        // 16px horizontal
  buttonPaddingY: spacing[2],        // 8px vertical
  inputPaddingX: spacing[3],         // 12px horizontal
  inputPaddingY: spacing[2],         // 8px vertical

  // Touch targets (minimum 44px for accessibility)
  minTouchTarget: '44px',
  comfortableTouchTarget: '48px',

  // Page margins
  pageMarginMobile: spacing[4],      // 16px
  pageMarginTablet: spacing[6],      // 24px
  pageMarginDesktop: spacing[8],     // 32px
} as const;
