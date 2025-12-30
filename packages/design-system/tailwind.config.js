import { colors, spacing, typography, borderRadius, shadows } from './src/tokens/index';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Flatten the color structure for Tailwind usage
        polar: colors.polar,
        snow: colors.snow,
        frost: colors.frost,
        aurora: colors.aurora,

        // Semantic shortcuts
        primary: colors.semantic.primary,
        accent: colors.semantic.accent,
        success: colors.semantic.success,
        error: colors.semantic.error,
        warning: colors.semantic.warning,

        // Text shortcuts
        text: {
          DEFAULT: colors.semantic.textPrimary,
          heading: colors.semantic.textHeading,
          secondary: colors.semantic.textSecondary,
          muted: colors.semantic.textMuted,
          inverse: colors.semantic.textInverse,
        },

        // Background shortcuts
        bg: {
          DEFAULT: colors.semantic.bgPrimary,
          secondary: colors.semantic.bgSecondary,
          elevated: colors.semantic.bgElevated,
        },

        // Border shortcuts
        border: {
          DEFAULT: colors.semantic.borderDefault,
          subtle: colors.semantic.borderSubtle,
          strong: colors.semantic.borderStrong,
        },

        // Condition badges
        condition: colors.condition,
      },

      spacing: spacing,

      fontFamily: {
        sans: typography.fontFamily.primary.split(','),
        mono: typography.fontFamily.mono.split(','),
      },

      fontSize: typography.fontSize,
      fontWeight: {
        normal: String(typography.fontWeight.normal),
        medium: String(typography.fontWeight.medium),
        semibold: String(typography.fontWeight.semibold),
        bold: String(typography.fontWeight.bold),
      },
      lineHeight: {
        none: String(typography.lineHeight.none),
        tight: String(typography.lineHeight.tight),
        snug: String(typography.lineHeight.snug),
        normal: String(typography.lineHeight.normal),
        relaxed: String(typography.lineHeight.relaxed),
        loose: String(typography.lineHeight.loose),
      },
      letterSpacing: typography.letterSpacing,

      borderRadius: borderRadius,

      boxShadow: {
        ...shadows,
      },

      transitionDuration: {
        instant: '100ms',
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },

      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
      },

      // Custom ring colors for focus states
      ringColor: {
        DEFAULT: 'rgba(136, 192, 208, 0.3)',
      },

      ringWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
