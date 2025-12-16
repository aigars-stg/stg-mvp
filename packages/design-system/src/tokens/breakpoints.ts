/**
 * Breakpoint Tokens
 *
 * Second Turn uses Tailwind's default breakpoints which are battle-tested
 * and cover 99% of device scenarios.
 *
 * Philosophy: Mobile-first responsive design
 * - Base styles target mobile (< 640px)
 * - Progressive enhancement for larger screens
 * - Primary desktop/mobile split at lg: (1024px)
 */

export const breakpoints = {
  /**
   * Small tablets, large phones (landscape)
   * 640px and up
   *
   * Common devices: iPhone Pro Max (landscape), small tablets
   * Usage: Tablet layout adjustments, 2-column grids
   */
  sm: '640px',

  /**
   * Tablets, small laptops
   * 768px and up
   *
   * Common devices: iPad (portrait), Android tablets
   * Usage: Desktop header navigation appears, multi-column layouts
   */
  md: '768px',

  /**
   * Desktops, laptops
   * 1024px and up
   *
   * **PRIMARY MOBILE/DESKTOP SPLIT**
   *
   * Common devices: Laptops, desktops, large tablets (landscape)
   * Usage:
   * - Hide mobile bottom navigation
   * - Show desktop header navigation
   * - Multi-column layouts (2-3 columns)
   * - Sidebar layouts
   */
  lg: '1024px',

  /**
   * Large desktops, wide screens
   * 1280px and up
   *
   * Common devices: Desktop monitors, large laptops
   * Usage: 4-column grids, wider content containers
   */
  xl: '1280px',

  /**
   * Ultra-wide monitors
   * 1536px and up
   *
   * Common devices: Ultra-wide monitors, 4K displays
   * Usage: Rarely used, optional wide-screen optimizations
   */
  '2xl': '1536px',
} as const;

/**
 * Semantic Breakpoint Names
 *
 * Use these for clearer intent in component documentation
 */
export const semanticBreakpoints = {
  mobile: breakpoints.sm,      // 640px - Landscape phones
  tablet: breakpoints.md,      // 768px - Tablets
  desktop: breakpoints.lg,     // 1024px - Primary split
  wide: breakpoints.xl,        // 1280px - Large desktops
  ultraWide: breakpoints['2xl'], // 1536px - Ultra-wide
} as const;

/**
 * Container Max Widths
 *
 * Maximum widths for content containers at each breakpoint
 */
export const containerMaxWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '7xl': '1280px', // Standard Second Turn container (max-w-7xl)
} as const;

/**
 * Common Responsive Patterns
 *
 * Reusable Tailwind class patterns for consistency
 */
export const responsivePatterns = {
  // Containers
  container: 'max-w-7xl mx-auto px-4 sm:px-6',
  containerPadded: 'max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12',

  // Grid Patterns
  gridCols: {
    '1-2-3-4': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    '1-2-3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '1-2': 'grid grid-cols-1 sm:grid-cols-2',
  },

  // Spacing
  gap: 'gap-4 sm:gap-6',
  gapLarge: 'gap-6 sm:gap-8',
  padding: 'p-4 sm:p-6',
  paddingVertical: 'py-8 sm:py-12',

  // Typography
  headingHero: 'text-3xl sm:text-4xl lg:text-5xl',
  headingPage: 'text-2xl sm:text-3xl',
  headingSection: 'text-xl sm:text-2xl',
  textBody: 'text-sm sm:text-base',

  // Visibility
  hideOnMobile: 'hidden md:flex',
  hideOnDesktop: 'md:hidden',
  hideBelowDesktop: 'lg:hidden',
  hideOnDesktopOnly: 'hidden lg:block',

  // Layout
  flexResponsive: 'flex flex-col lg:flex-row',
  stackToHorizontal: 'flex flex-col sm:flex-row',

  // Bottom Nav Clearance
  contentWithBottomNav: 'pb-20 lg:pb-0',
} as const;

/**
 * Device Categories
 *
 * Reference for understanding device sizes
 */
export const deviceCategories = {
  mobile: {
    small: '320px - 375px',   // iPhone SE, small Android
    medium: '375px - 414px',  // iPhone standard, most Android
    large: '414px - 639px',   // iPhone Pro Max, large Android
  },
  tablet: {
    portrait: '768px - 834px',   // iPad, Android tablets
    landscape: '1024px - 1112px', // iPad (landscape)
  },
  desktop: {
    laptop: '1024px - 1440px',  // Standard laptops
    desktop: '1440px - 1920px', // Desktop monitors
    wide: '1920px+',            // Ultra-wide monitors
  },
} as const;

/**
 * Touch Target Sizes (WCAG)
 *
 * Minimum touch target sizes for accessibility
 */
export const touchTargets = {
  minimum: '24px',    // WCAG 2.2 Level AA (24×24px)
  recommended: '44px', // Apple/Android guidelines (44×44px)
  checkout: '48px',    // Second Turn checkout standard (48×48px)
} as const;
