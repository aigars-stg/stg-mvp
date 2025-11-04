import { colors } from './colors';

// Typography system using Inter for Nordic technical clarity
export const typography = {
  // Font families
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },

  // Font sizes (aligned to 4px grid for consistency)
  fontSize: {
    xs: '0.75rem',      // 12px - smallest text, metadata
    sm: '0.875rem',     // 14px - secondary text
    base: '1rem',       // 16px - body text (NEVER go smaller for main content)
    lg: '1.125rem',     // 18px - emphasized text
    xl: '1.25rem',      // 20px - small headings
    '2xl': '1.5rem',    // 24px - section headings
    '3xl': '1.875rem',  // 30px - page headings (adjusted to 4px)
    '4xl': '2.25rem',   // 36px - hero headings (adjusted to 4px)
    '5xl': '3rem',      // 48px - display text
  },

  // Font weights (Inter provides excellent range)
  fontWeight: {
    normal: 400,    // Regular - body text
    medium: 500,    // Medium - subtle emphasis
    semibold: 600,  // Semibold - headings, emphasis
    bold: 700,      // Bold - prices, strong emphasis
  },

  // Line heights (aligned to 4px grid where possible)
  lineHeight: {
    none: 1,
    tight: 1.2,     // Headlines
    snug: 1.375,    // Sub-headlines
    normal: 1.5,    // Body text (24px at 16px font = perfect 8px grid)
    relaxed: 1.625, // Comfortable reading
    loose: 2,       // Very relaxed
  },

  // Letter spacing (negative for headlines, default for body)
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0em',
    wide: '0.01em',
    wider: '0.02em',
  },
} as const;

// Semantic typography for common use cases
export const semanticTypography = {
  // Headings
  h1: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.normal,
  },
  h4: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.normal,
  },

  // Body text
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.relaxed,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },

  // Special cases
  price: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.none,
    letterSpacing: typography.letterSpacing.normal,
  },
  metadata: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    color: colors.semantic.textSecondary,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.wide,
  },
} as const;
