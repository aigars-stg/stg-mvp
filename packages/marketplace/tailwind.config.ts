import type { Config } from 'tailwindcss';
import { colors, spacing, typography, borderRadius, shadows } from '@second-turn/design-system/tokens';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include design system source files so Tailwind generates their styles
    '../design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system colors
        polar: colors.polar,
        snow: colors.snow,
        frost: colors.frost,
        aurora: colors.aurora,
        success: colors.semantic.success,
        error: colors.semantic.error,
        warning: colors.semantic.warning,
        text: {
          DEFAULT: colors.semantic.textPrimary,
          secondary: colors.semantic.textSecondary,
          muted: colors.semantic.textMuted,
          inverse: colors.semantic.textInverse,
        },
        bg: {
          DEFAULT: colors.semantic.bgPrimary,
          secondary: colors.semantic.bgSecondary,
          elevated: colors.semantic.bgElevated,
        },
        condition: colors.condition,
        // shadcn/ui colors (CSS variables for theming)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      spacing: spacing,
      fontFamily: {
        sans: typography.fontFamily.primary.split(','),
      },
      fontSize: typography.fontSize,
      fontWeight: {
        normal: String(typography.fontWeight.normal),
        medium: String(typography.fontWeight.medium),
        semibold: String(typography.fontWeight.semibold),
        bold: String(typography.fontWeight.bold),
      },
      lineHeight: {
        normal: String(typography.lineHeight.normal),
        relaxed: String(typography.lineHeight.relaxed),
      },
      borderRadius: {
        ...borderRadius,
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: shadows,
      ringWidth: {
        '3': '3px',
      },
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ease-out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      keyframes: {
        'fade-in-out': {
          '0%': { opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'swipe-left': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-10px)' },
        },
        'swipe-right': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
      },
      animation: {
        'fade-in-out': 'fade-in-out 3s ease-in-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'swipe-left': 'swipe-left 1.5s ease-in-out infinite',
        'swipe-right': 'swipe-right 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};

export default config;
