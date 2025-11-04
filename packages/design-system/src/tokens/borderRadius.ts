// Border radius system - moderate warmth without excessive rounding
export const borderRadius = {
  none: '0',
  xs: '0.25rem',    // 4px - very subtle
  sm: '0.375rem',   // 6px - small elements
  md: '0.5rem',     // 8px - standard UI elements
  lg: '0.75rem',    // 12px - cards and larger containers
  xl: '1rem',       // 16px - modals and overlays
  '2xl': '1.5rem',  // 24px - pill shapes for badges
  full: '9999px',   // Fully rounded (avatars, some badges)
} as const;

// Semantic border radius for specific components
export const semanticRadius = {
  button: borderRadius.md,           // 8px - clean and technical
  input: borderRadius.md,            // 8px - matches buttons
  card: borderRadius.lg,             // 12px - friendly containers
  modal: borderRadius.xl,            // 16px - elevated overlays
  badge: borderRadius['2xl'],        // 24px - pill shape
  conditionBadge: borderRadius['2xl'], // 24px - friendly condition badges
  avatar: borderRadius.full,         // Fully rounded
  image: borderRadius.md,            // 8px - product images in cards
} as const;
