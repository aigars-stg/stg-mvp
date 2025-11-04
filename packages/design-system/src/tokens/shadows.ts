// Shadow system - subtle Nordic elevation (not dramatic Material Design)
export const shadows = {
  // Base shadows using Nordic color palette
  none: 'none',
  xs: '0 1px 2px 0 rgba(46, 52, 64, 0.05)',      // Minimal depth
  sm: '0 1px 3px 0 rgba(46, 52, 64, 0.08)',      // Subtle elevation
  md: '0 4px 8px 0 rgba(46, 52, 64, 0.12)',      // Standard depth
  lg: '0 8px 16px 0 rgba(46, 52, 64, 0.16)',     // Prominent depth
  xl: '0 12px 24px 0 rgba(46, 52, 64, 0.20)',    // Maximum elevation

  // Inset shadows for inputs
  inset: 'inset 0 2px 4px 0 rgba(46, 52, 64, 0.06)',

  // Focus ring (using frost.ice color)
  focus: '0 0 0 3px rgba(136, 192, 208, 0.3)',
} as const;

// Semantic shadows for elevation levels
export const elevation = {
  0: shadows.none,      // Base level - no shadow
  1: shadows.sm,        // Resting cards - subtle containment
  2: shadows.md,        // Hover states - interaction feedback
  3: shadows.lg,        // Modals, dropdowns - clear separation
  4: shadows.xl,        // Toasts, important overlays - maximum attention
} as const;
