# Second Turn Games - Complete Implementation Specification

## Project Vision and Philosophy

Second Turn Games is a Baltic board game marketplace built on the philosophy that "Every game deserves a second turn." This platform connects board game enthusiasts in the Baltic region with pre-loved games, emphasizing trust, transparency, and the circular economy without sustainability preaching. The design embraces Nordic minimalism with warm touches, creating a technically precise yet approachable marketplace that makes buying used games feel smart rather than thrifty.

## Phase 1: Design System Foundation

### Project Structure

The project should be organized as a monorepo with clear separation between the design system site and the eventual marketplace application. This allows the design system to evolve independently and serve as living documentation throughout development.

```
second-turn-games/
├── packages/
│   ├── design-system/          # Component library and tokens
│   │   ├── src/
│   │   │   ├── tokens/         # Design tokens (colors, spacing, typography)
│   │   │   ├── components/     # Reusable React components
│   │   │   ├── styles/         # Global styles and utilities
│   │   │   └── index.ts        # Main export
│   │   └── package.json
│   ├── design-system-site/     # Documentation and showcase site
│   │   ├── src/
│   │   │   ├── pages/          # Design system documentation pages
│   │   │   ├── components/     # Site-specific components
│   │   │   └── examples/       # Component usage examples
│   │   └── package.json
│   └── marketplace/            # Future: Actual marketplace application
│       └── package.json
├── package.json                # Root package.json for workspace
└── README.md
```

### Technology Stack

The design system should be built with modern, reliable technologies that reflect Baltic technical sophistication. Use React with TypeScript for type safety and developer experience. Vite provides the fast build tooling that matches Baltic expectations for snappy interfaces. Tailwind CSS serves as the foundation, but you will extend it heavily with your custom design tokens rather than using default Tailwind values.

For the design system site specifically, use Next.js 14 with the App Router. This provides excellent developer experience, automatic code splitting, and the ability to showcase components with live examples. The site should be deployed to Vercel for instant global distribution and preview deployments on every commit.

Styling should use CSS-in-JS through vanilla-extract or CSS Modules rather than styled-components. This gives you zero-runtime overhead and excellent TypeScript integration while maintaining the component-scoped styles you need for a design system.

### Design Tokens Implementation

Design tokens are the atomic values that make up your design system. They should be defined once in TypeScript and consumed everywhere, ensuring perfect consistency across all implementations.

Create a file at `packages/design-system/src/tokens/colors.ts` that defines your complete color palette:

```typescript
// Color palette based on Nordic aesthetic with trust-building blues
export const colors = {
  // Nordic Polar Night - Base darks
  polar: {
    night: '#2E3440',      // Primary text, dark mode background
    nightLight: '#3B4252',  // Elevated surfaces in dark mode
    nightMedium: '#434C5E', // Further elevated surfaces
    nightDark: '#4C566A',   // Borders and dividers in dark mode
  },
  
  // Nordic Snow Storm - Base lights
  snow: {
    storm: '#D8DEE9',       // Subtle borders and dividers
    stormLight: '#E5E9F0',  // Elevated surfaces in light mode
    stormLightest: '#ECEFF4', // Primary background
    white: '#FEFEFE',       // Card backgrounds (not pure white)
  },
  
  // Nordic Frost - Primary trust colors (your signature)
  frost: {
    ice: '#88C0D0',         // Primary brand color - trust, CTAs
    polar: '#81A1C1',       // Hover states, active states
    arctic: '#5E81AC',      // Deep trust - verification badges
    ocean: '#4C7099',       // Pressed states, dark accents
  },
  
  // Aurora colors - Accents and states
  aurora: {
    orange: '#D08770',      // Urgency, hot deals (your refined orange)
    green: '#A3BE8C',       // Success states only (minimal use)
    red: '#BF616A',         // Errors, rare/collectible items
    yellow: '#EBCB8B',      // Warnings, attention needed
  },
  
  // Semantic colors - mapped from palette
  semantic: {
    // Trust and primary actions
    primary: '#88C0D0',           // frost.ice
    primaryHover: '#81A1C1',      // frost.polar
    primaryActive: '#5E81AC',     // frost.arctic
    
    // Urgency and deals
    accent: '#D08770',            // aurora.orange
    accentHover: '#C97862',
    accentActive: '#B86954',
    
    // Success (minimal use)
    success: '#A3BE8C',
    successHover: '#95B07D',
    successActive: '#87A06E',
    
    // Error states
    error: '#BF616A',
    errorHover: '#B5525B',
    errorActive: '#AB4E4C',
    
    // Warning states
    warning: '#EBCB8B',
    warningHover: '#E4C37C',
    warningActive: '#DDBB6D',
    
    // Text colors
    textPrimary: '#2E3440',       // polar.night
    textSecondary: '#434C5E',     // polar.nightMedium at 70% opacity
    textMuted: '#4C566A',         // polar.nightDark at 50% opacity
    textInverse: '#ECEFF4',       // For dark backgrounds
    
    // Background colors
    bgPrimary: '#ECEFF4',         // snow.stormLightest
    bgSecondary: '#E5E9F0',       // snow.stormLight
    bgElevated: '#FEFEFE',        // snow.white - cards
    bgOverlay: 'rgba(46, 52, 64, 0.6)', // Modals, drawers
    
    // Border colors
    borderSubtle: '#D8DEE9',      // snow.storm
    borderDefault: '#C8CED9',     // Slightly darker
    borderStrong: '#B8BEC9',      // For emphasis
    borderFocus: '#88C0D0',       // frost.ice
  },
  
  // Condition badge colors (special marketplace need)
  condition: {
    likeNew: {
      bg: '#E3EEF4',
      text: '#5E81AC',
      border: '#88C0D0',
    },
    veryGood: {
      bg: '#E8F3E6',
      text: '#6B8E5F',
      border: '#A3BE8C',
    },
    good: {
      bg: '#F7F0DB',
      text: '#9B8556',
      border: '#EBCB8B',
    },
    acceptable: {
      bg: '#F5E3DB',
      text: '#A66B50',
      border: '#D08770',
    },
    forParts: {
      bg: '#F4DBDC',
      text: '#9B4B52',
      border: '#BF616A',
    },
  },
} as const;
```

Next, define your spacing system in `packages/design-system/src/tokens/spacing.ts`. This implements the critical 8-point grid that's fundamental to Nordic design:

```typescript
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
```

Typography is critical for establishing trust and technical credibility. Define it in `packages/design-system/src/tokens/typography.ts`:

```typescript
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
```

Border radius should be defined to create that warm technical feel in `packages/design-system/src/tokens/borderRadius.ts`:

```typescript
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
```

Shadows should be subtle and purpose-driven, defined in `packages/design-system/src/tokens/shadows.ts`:

```typescript
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
```

Finally, animation timing should reflect Baltic expectations for snappy interfaces in `packages/design-system/src/tokens/animation.ts`:

```typescript
// Animation timing - fast and responsive for Baltic users
export const animation = {
  // Duration (max 200ms for UI, 300ms for page transitions)
  duration: {
    instant: '100ms',    // Immediate feedback
    fast: '150ms',       // Hover states, tooltips
    normal: '200ms',     // Standard transitions
    slow: '300ms',       // Page transitions, complex animations
  },
  
  // Easing functions
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',     // Default
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',   // Enter
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',     // Exit
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',        // Quick attention
  },
  
  // Common transitions (combine duration + easing)
  transition: {
    fast: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    normal: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slow: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

// Semantic animations for specific interactions
export const semanticAnimation = {
  hover: {
    // Subtle scale and shadow change
    scale: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  press: {
    // Quick scale down feedback
    scale: 'transform 100ms cubic-bezier(0.4, 0.0, 1, 1)',
  },
  focus: {
    // Ring appearance
    ring: 'box-shadow 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  modal: {
    // Overlay fade in
    overlay: 'opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    content: 'transform 300ms cubic-bezier(0.0, 0.0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;
```

### Tailwind Configuration

Your Tailwind configuration should extend the defaults with all your custom tokens. Create this at `packages/design-system/tailwind.config.js`:

```javascript
import { colors, spacing, typography, borderRadius, shadows, animation } from './src/tokens';

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
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      letterSpacing: typography.letterSpacing,
      
      borderRadius: borderRadius,
      
      boxShadow: {
        ...shadows,
        ...elevation,
      },
      
      transitionDuration: animation.duration,
      transitionTimingFunction: animation.easing,
    },
  },
  plugins: [],
};
```

## Phase 2: Core Component Library

With tokens established, you can now build the core component library. Each component should be built with TypeScript, accessibility in mind, and comprehensive documentation.

### Button Component

The button is your most fundamental interactive element. It needs multiple variants to handle different semantic meanings while maintaining visual consistency. Create `packages/design-system/src/components/Button/Button.tsx`:

```typescript
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Define button variants using cva for type-safe variant management
const buttonVariants = cva(
  // Base styles applied to all buttons
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary: trust actions (login, purchase, main CTAs)
        primary: 'bg-frost-ice text-polar-night hover:bg-frost-polar active:bg-frost-arctic shadow-sm hover:shadow-md',
        
        // Secondary: alternative actions (cancel, back, filters)
        secondary: 'bg-snow-white text-polar-night border-2 border-border hover:bg-snow-stormLight hover:border-border-strong shadow-sm hover:shadow-md',
        
        // Accent: urgency (buy now, limited time)
        accent: 'bg-aurora-orange text-snow-white hover:bg-[#C97862] active:bg-[#B86954] shadow-sm hover:shadow-md',
        
        // Ghost: subtle actions (show more, expand)
        ghost: 'text-polar-night hover:bg-snow-stormLight active:bg-snow-storm',
        
        // Danger: destructive actions (delete, remove)
        danger: 'bg-aurora-red text-snow-white hover:bg-[#B5525B] active:bg-[#AB4E4C] shadow-sm hover:shadow-md',
      },
      
      size: {
        sm: 'h-9 px-3 text-sm rounded-md',           // 36px height (close to 44px touch target with margin)
        md: 'h-11 px-4 text-base rounded-md',        // 44px height (perfect touch target)
        lg: 'h-12 px-6 text-lg rounded-lg',          // 48px height (comfortable touch target)
      },
      
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth, 
    loading, 
    leftIcon, 
    rightIcon,
    children, 
    disabled,
    ...props 
  }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Card Component

Cards are critical for your marketplace since every game listing will be displayed in a card. Create `packages/design-system/src/components/Card/Card.tsx`:

```typescript
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg transition-all',
  {
    variants: {
      variant: {
        // Standard: most cards (game listings, content blocks)
        standard: 'bg-bg-elevated border border-border-subtle shadow-sm',
        
        // Elevated: important cards (featured games, highlighted content)
        elevated: 'bg-bg-elevated shadow-md hover:shadow-lg',
        
        // Interactive: clickable cards (game listings that navigate)
        interactive: 'bg-bg-elevated border-2 border-transparent shadow-sm hover:border-frost-ice/20 hover:shadow-md cursor-pointer active:scale-[0.98]',
        
        // Outlined: subtle cards (filter panels, sidebars)
        outlined: 'bg-transparent border-2 border-border',
      },
      
      padding: {
        none: 'p-0',
        sm: 'p-3',      // 12px
        md: 'p-4',      // 16px - standard
        lg: 'p-6',      // 24px - comfortable
      },
    },
    defaultVariants: {
      variant: 'standard',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ variant, padding, className })}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for consistent structure
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 ${className || ''}`}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={`font-semibold text-xl leading-tight tracking-tight ${className || ''}`}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-text-secondary ${className || ''}`}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`pt-0 ${className || ''}`} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center pt-0 ${className || ''}`}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
```

### Badge Component

Badges are critical for condition indicators and trust signals. Create `packages/design-system/src/components/Badge/Badge.tsx`:

```typescript
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors',
  {
    variants: {
      variant: {
        // Trust and verification badges
        trust: 'bg-frost-ice/10 text-frost-arctic border border-frost-ice/30',
        
        // Condition badges (special marketplace need)
        likeNew: 'bg-condition-likeNew-bg text-condition-likeNew-text border border-condition-likeNew-border',
        veryGood: 'bg-condition-veryGood-bg text-condition-veryGood-text border border-condition-veryGood-border',
        good: 'bg-condition-good-bg text-condition-good-text border border-condition-good-border',
        acceptable: 'bg-condition-acceptable-bg text-condition-acceptable-text border border-condition-acceptable-border',
        forParts: 'bg-condition-forParts-bg text-condition-forParts-text border border-condition-forParts-border',
        
        // Semantic badges
        success: 'bg-aurora-green/10 text-[#6B8E5F] border border-aurora-green/30',
        warning: 'bg-aurora-yellow/10 text-[#9B8556] border border-aurora-yellow/30',
        error: 'bg-aurora-red/10 text-aurora-red border border-aurora-red/30',
        
        // Neutral badges
        default: 'bg-snow-storm text-polar-night border border-border',
        outline: 'bg-transparent text-polar-night border-2 border-border',
      },
      
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-2xl',       // Small, subtle
        md: 'px-3 py-1 text-sm rounded-2xl',         // Standard pill shape
        lg: 'px-4 py-1.5 text-base rounded-2xl',     // Prominent
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={badgeVariants({ variant, size, className })}
        {...props}
      >
        {icon && <span className="mr-1.5">{icon}</span>}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
```

### Input Component

Form inputs need to feel trustworthy and technical. Create `packages/design-system/src/components/Input/Input.tsx`:

```typescript
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'flex w-full rounded-md border-2 bg-bg-elevated px-3 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-border focus-visible:border-frost-ice',
        error: 'border-aurora-red focus-visible:border-aurora-red',
        success: 'border-aurora-green focus-visible:border-aurora-green',
      },
      inputSize: {
        sm: 'h-9 text-sm',        // 36px
        md: 'h-11 text-base',     // 44px touch target
        lg: 'h-12 text-lg',       // 48px comfortable
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    inputSize, 
    label, 
    error, 
    helperText,
    leftIcon,
    rightIcon,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const effectiveVariant = error ? 'error' : variant;
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            className={inputVariants({ 
              variant: effectiveVariant, 
              inputSize, 
              className: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : className 
            })}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-aurora-red"
          >
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1.5 text-sm text-text-secondary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

## Phase 3: Design System Site

The design system site serves as living documentation and a testing ground for components. It should showcase every token, component, and pattern with live examples and code snippets.

### Site Structure

Create the Next.js site at `packages/design-system-site/` with this page structure:

```
src/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx                # Home/introduction
│   ├── getting-started/
│   │   └── page.tsx            # Installation and setup
│   ├── tokens/
│   │   ├── colors/
│   │   │   └── page.tsx        # Color palette showcase
│   │   ├── typography/
│   │   │   └── page.tsx        # Typography system
│   │   ├── spacing/
│   │   │   └── page.tsx        # Spacing and grid
│   │   ├── shadows/
│   │   │   └── page.tsx        # Shadow system
│   │   └── animation/
│   │       └── page.tsx        # Animation tokens
│   ├── components/
│   │   ├── button/
│   │   │   └── page.tsx        # Button documentation
│   │   ├── card/
│   │   │   └── page.tsx        # Card documentation
│   │   ├── badge/
│   │   │   └── page.tsx        # Badge documentation
│   │   ├── input/
│   │   │   └── page.tsx        # Input documentation
│   │   └── [more components...]
│   └── patterns/
│       ├── game-card/
│       │   └── page.tsx        # Game listing card pattern
│       ├── seller-profile/
│       │   └── page.tsx        # Seller verification pattern
│       └── condition-display/
│           └── page.tsx        # Condition badge pattern
```

### Example Page: Colors

Create `packages/design-system-site/src/app/tokens/colors/page.tsx` to showcase your color system:

```typescript
import { colors } from '@second-turn/design-system/tokens';

export default function ColorsPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-polar-night mb-4">
          Color System
        </h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Our color palette is inspired by Nordic minimalism with trust-building blues 
          at its core. These colors establish credibility while maintaining the warmth 
          essential to community marketplaces.
        </p>
      </div>

      {/* Brand Colors */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Nordic Frost - Primary Brand Colors
        </h2>
        <p className="text-text-secondary mb-6">
          Blue is the foundation of trust in our marketplace. These frost colors 
          communicate reliability, security, and technical competence.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(colors.frost).map(([name, value]) => (
            <ColorSwatch
              key={name}
              name={name}
              value={value}
              usage={getFrostUsage(name)}
            />
          ))}
        </div>
      </section>

      {/* Aurora Colors */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Aurora - Accent Colors
        </h2>
        <p className="text-text-secondary mb-6">
          Aurora colors add energy and meaning to specific interface states. 
          Use sparingly for maximum impact.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(colors.aurora).map(([name, value]) => (
            <ColorSwatch
              key={name}
              name={name}
              value={value}
              usage={getAuroraUsage(name)}
            />
          ))}
        </div>
      </section>

      {/* Condition Badge Colors */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Condition Grades
        </h2>
        <p className="text-text-secondary mb-6">
          Special color combinations designed to make used game condition grades 
          feel friendly and approachable rather than judgmental.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(colors.condition).map(([grade, colorSet]) => (
            <ConditionSwatch
              key={grade}
              grade={grade}
              colorSet={colorSet}
            />
          ))}
        </div>
      </section>

      {/* Usage Guidelines */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Usage Guidelines
        </h2>
        <div className="space-y-6">
          <GuidelineCard
            title="Always use frost.ice for primary CTAs"
            description="This is your signature color. It builds trust and should be the most prominent blue in any interface."
            example={
              <button className="bg-frost-ice text-polar-night px-4 py-2 rounded-md font-medium hover:bg-frost-polar transition-colors">
                Primary Action
              </button>
            }
          />
          
          <GuidelineCard
            title="Limit aurora.orange to urgency only"
            description="Orange signals deals and time-sensitive actions. Overuse dilutes its power."
            example={
              <div className="bg-aurora-orange/10 border border-aurora-orange/30 px-4 py-2 rounded-md">
                <span className="text-aurora-orange font-semibold">⚡ Hot Deal - 24h Only</span>
              </div>
            }
          />
          
          <GuidelineCard
            title="Avoid green sustainability clichés"
            description="Only use aurora.green for success states, never as primary brand color. Let the circular economy speak through actions, not color."
            example={
              <div className="flex items-center gap-2 text-aurora-green">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Game added to collection</span>
              </div>
            }
          />
        </div>
      </section>
    </div>
  );
}

// Supporting components for the color documentation
function ColorSwatch({ name, value, usage }: { name: string; value: string; usage: string }) {
  return (
    <div className="space-y-3">
      <div 
        className="h-24 rounded-lg border border-border-subtle shadow-sm"
        style={{ backgroundColor: value }}
      />
      <div>
        <div className="font-semibold text-polar-night capitalize">
          {name.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        <div className="text-sm text-text-secondary font-mono">
          {value}
        </div>
        <div className="text-sm text-text-secondary mt-1">
          {usage}
        </div>
      </div>
    </div>
  );
}

function ConditionSwatch({ grade, colorSet }: { grade: string; colorSet: any }) {
  return (
    <div className="space-y-2">
      <div 
        className="h-16 rounded-2xl border flex items-center justify-center font-medium text-sm"
        style={{ 
          backgroundColor: colorSet.bg,
          color: colorSet.text,
          borderColor: colorSet.border,
        }}
      >
        {grade.replace(/([A-Z])/g, ' $1').trim()}
      </div>
      <div className="text-xs text-text-muted text-center font-mono">
        {colorSet.bg}
      </div>
    </div>
  );
}

function GuidelineCard({ title, description, example }: { 
  title: string; 
  description: string; 
  example: React.ReactNode;
}) {
  return (
    <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
      <h3 className="font-semibold text-polar-night mb-2">{title}</h3>
      <p className="text-text-secondary mb-4">{description}</p>
      <div className="bg-bg-secondary p-4 rounded-md">
        {example}
      </div>
    </div>
  );
}

// Helper functions for usage descriptions
function getFrostUsage(name: string): string {
  const usageMap: Record<string, string> = {
    ice: 'Primary CTAs, trust badges, focus states',
    polar: 'Hover states, active navigation',
    arctic: 'Verification badges, pressed states',
    ocean: 'Dark accents, secondary emphasis',
  };
  return usageMap[name] || '';
}

function getAuroraUsage(name: string): string {
  const usageMap: Record<string, string> = {
    orange: 'Hot deals, urgency, time-sensitive',
    green: 'Success states only',
    red: 'Errors, rare items, collectibles',
    yellow: 'Warnings, attention needed',
  };
  return usageMap[name] || '';
}
```

### Component Documentation Pattern

Each component page should follow this structure to provide comprehensive documentation:

```typescript
// Example: packages/design-system-site/src/app/components/button/page.tsx

import { Button } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { CodeBlock } from '@/components/CodeBlock';

export default function ButtonPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      {/* Overview */}
      <section className="mb-12">
        <h1 className="text-4xl font-bold text-polar-night mb-4">Button</h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Buttons are the primary way users take actions in the interface. 
          Our button system provides clear visual hierarchy through variants 
          while maintaining Nordic minimalism through restrained styling.
        </p>
      </section>

      {/* Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Variants</h2>
        
        <ComponentDemo
          title="Primary"
          description="Trust actions like login, purchase, and main CTAs. Uses frost.ice for maximum trust."
        >
          <Button variant="primary">Primary Button</Button>
        </ComponentDemo>
        
        <ComponentDemo
          title="Secondary"
          description="Alternative actions like cancel, back, or secondary paths."
        >
          <Button variant="secondary">Secondary Button</Button>
        </ComponentDemo>
        
        <ComponentDemo
          title="Accent"
          description="Urgency actions like 'Buy Now' or limited-time offers."
        >
          <Button variant="accent">Accent Button</Button>
        </ComponentDemo>
        
        <ComponentDemo
          title="Ghost"
          description="Subtle actions that don't need visual prominence."
        >
          <Button variant="ghost">Ghost Button</Button>
        </ComponentDemo>
        
        <ComponentDemo
          title="Danger"
          description="Destructive actions that require user caution."
        >
          <Button variant="danger">Delete Item</Button>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>
        
        <ComponentDemo
          title="All Sizes"
          description="Buttons sized for different contexts and touch targets."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </ComponentDemo>
      </section>

      {/* With Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">With Icons</h2>
        
        <ComponentDemo
          title="Icon Placement"
          description="Add icons to provide visual context for actions."
        >
          <div className="flex flex-wrap gap-4">
            <Button leftIcon={<SearchIcon />}>Search Games</Button>
            <Button rightIcon={<ArrowRightIcon />}>Continue</Button>
            <Button leftIcon={<CartIcon />} variant="accent">
              Add to Cart
            </Button>
          </div>
        </ComponentDemo>
      </section>

      {/* States */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">States</h2>
        
        <ComponentDemo
          title="Loading State"
          description="Show progress for asynchronous actions."
        >
          <Button loading>Processing...</Button>
        </ComponentDemo>
        
        <ComponentDemo
          title="Disabled State"
          description="Indicate unavailable actions."
        >
          <Button disabled>Disabled Button</Button>
        </ComponentDemo>
      </section>

      {/* Usage Guidelines */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>
        
        <div className="space-y-6">
          <GuidelineBox
            type="do"
            title="Use primary for main page actions"
            description="Every page should have one clear primary action. This guides users toward the intended flow."
          />
          
          <GuidelineBox
            type="do"
            title="Use accent sparingly for urgency"
            description="The orange accent should be reserved for time-sensitive or high-value actions. Overuse diminishes its impact."
          />
          
          <GuidelineBox
            type="dont"
            title="Don't use multiple primary buttons together"
            description="If you have multiple actions, use primary for the main action and secondary for alternatives."
          />
          
          <GuidelineBox
            type="dont"
            title="Don't make buttons too small"
            description="Always use at least 'md' size (44px) for touch targets. Use 'sm' only in dense interfaces where touch isn't primary."
          />
        </div>
      </section>

      {/* Code Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>
        
        <CodeBlock
          language="typescript"
          code={`import { Button } from '@second-turn/design-system';

function GameListing() {
  return (
    <div className="flex gap-3">
      <Button 
        variant="primary" 
        onClick={handlePurchase}
        loading={isPurchasing}
      >
        Buy Now
      </Button>
      
      <Button 
        variant="secondary"
        leftIcon={<HeartIcon />}
        onClick={handleSaveForLater}
      >
        Save for Later
      </Button>
    </div>
  );
}`}
        />
      </section>

      {/* Accessibility */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>
        
        <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Navigation</h3>
            <p className="text-text-secondary">
              All buttons are keyboard accessible via Tab navigation. Press Enter or Space to activate.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus States</h3>
            <p className="text-text-secondary">
              Buttons show a visible focus ring (3px frost.ice at 30% opacity) when focused via keyboard.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Screen Readers</h3>
            <p className="text-text-secondary">
              Button text is automatically announced. For icon-only buttons, add an aria-label prop.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Loading States</h3>
            <p className="text-text-secondary">
              When loading, buttons are disabled and aria-busy is set to true to inform assistive technology.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
```

## Phase 4: Marketplace-Specific Patterns

After the foundation is solid, build marketplace-specific composite components that combine your base components into higher-level patterns.

### Game Card Pattern

The game card is the most important pattern in your marketplace. Create `packages/design-system/src/patterns/GameCard/GameCard.tsx`:

```typescript
import React from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';

export interface GameCardProps {
  game: {
    id: string;
    title: string;
    year: number;
    designer: string;
    imageUrl: string;
    price: number;
    currency: string;
    condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | 'forParts';
    location: {
      city: string;
      country: string;
    };
    seller: {
      name: string;
      rating: number;
      totalSales: number;
      verified: boolean;
    };
  };
  onCardClick?: () => void;
  onSaveClick?: () => void;
  isSaved?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ 
  game, 
  onCardClick, 
  onSaveClick,
  isSaved = false,
}) => {
  const conditionConfig = {
    likeNew: { variant: 'likeNew' as const, label: '📦 Like New', emoji: '📦' },
    veryGood: { variant: 'veryGood' as const, label: '✨ Very Good', emoji: '✨' },
    good: { variant: 'good' as const, label: '🎲 Good', emoji: '🎲' },
    acceptable: { variant: 'acceptable' as const, label: '🔧 Acceptable', emoji: '🔧' },
    forParts: { variant: 'forParts' as const, label: '⚙️ For Parts', emoji: '⚙️' },
  };

  const condition = conditionConfig[game.condition];

  return (
    <Card 
      variant="interactive" 
      padding="none"
      onClick={onCardClick}
      className="group overflow-hidden"
    >
      {/* Image Section - 50% of card height */}
      <div className="relative aspect-[3/4] overflow-hidden bg-snow-stormLight">
        <img
          src={game.imageUrl}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        
        {/* Condition Badge - Top Left */}
        <div className="absolute top-3 left-3">
          <Badge variant={condition.variant} size="md">
            {condition.label}
          </Badge>
        </div>
        
        {/* Save Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSaveClick?.();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-snow-white/90 hover:bg-snow-white transition-colors shadow-md"
          aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
        >
          <svg 
            className={`w-5 h-5 ${isSaved ? 'text-aurora-red fill-current' : 'text-polar-night'}`}
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
        </button>
        
        {/* Seller Verification - Bottom Right */}
        {game.seller.verified && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="trust" size="sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path 
                  fillRule="evenodd" 
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd" 
                />
              </svg>
              Verified
            </Badge>
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Title and Year */}
        <div>
          <h3 className="font-semibold text-lg text-polar-night line-clamp-2 group-hover:text-frost-arctic transition-colors">
            {game.title}
          </h3>
          <p className="text-sm text-text-secondary mt-0.5">
            {game.designer} • {game.year}
          </p>
        </div>
        
        {/* Price and Location */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-polar-night">
              {game.currency}{game.price}
            </span>
          </div>
          <div className="text-sm text-text-secondary">
            📍 {game.location.city}
          </div>
        </div>
        
        {/* Seller Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-frost-ice/20 flex items-center justify-center text-frost-arctic font-semibold text-sm">
              {game.seller.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-polar-night">
                {game.seller.name}
              </div>
              <div className="text-xs text-text-secondary">
                {game.seller.totalSales} sales
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-aurora-yellow fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-polar-night">
              {game.seller.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
```

## Phase 5: Backend Architecture (Future)

Once the design system and patterns are solid, you'll build the marketplace backend. Here's the high-level architecture to keep in mind:

### Technology Stack Recommendations

**Backend Framework:** Node.js with Express or Fastify for API. Consider NestJS if you want more structure and TypeScript-first development. Baltic developers appreciate TypeScript's type safety.

**Database:** PostgreSQL for relational data (games, users, transactions). Add Redis for caching and session management. Consider adding Elasticsearch for advanced game search if your catalog grows beyond a few thousand items.

**Authentication:** Implement email/password with JWT tokens. Add OAuth for Google and Facebook. Consider adding BoardGameGeek OAuth integration to allow users to link their BGG accounts for trust building.

**File Storage:** Use AWS S3 or Cloudflare R2 for game images. Implement image optimization with Sharp on upload to create multiple sizes (thumbnail, card, full).

**Payment Processing:** Integrate Stripe for payments. It's well-known in Baltic countries and supports local payment methods. Implement escrow system where funds are held until buyer confirms receipt.

**Search:** Start with PostgreSQL full-text search. Add filters for condition, price range, location, game mechanics, player count, and play time. If you grow beyond 10,000 listings, migrate to Elasticsearch.

### Database Schema Outline

```sql
-- Core tables needed for MVP

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  location_city VARCHAR(100),
  location_country VARCHAR(2),
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  bgg_username VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE games (
  id UUID PRIMARY KEY,
  bgg_id INTEGER,  -- Link to BoardGameGeek API
  title VARCHAR(255) NOT NULL,
  year INTEGER,
  designer VARCHAR(255),
  min_players INTEGER,
  max_players INTEGER,
  playing_time INTEGER,
  complexity DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  seller_id UUID REFERENCES users(id),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('likeNew', 'veryGood', 'good', 'acceptable', 'forParts')),
  description TEXT,
  language VARCHAR(50),
  box_condition VARCHAR(20),
  components_condition VARCHAR(20),
  completeness_checklist JSONB,  -- JSON array of components with true/false
  images JSONB,  -- Array of image URLs
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold', 'removed')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed')),
  escrow_released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id),
  reviewer_id UUID REFERENCES users(id),
  reviewee_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_game ON listings(game_id) WHERE status = 'active';
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
```

### API Endpoints Structure

```typescript
// RESTful API structure for marketplace

// Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

// Users
GET    /api/users/:id
PATCH  /api/users/:id
GET    /api/users/:id/listings
GET    /api/users/:id/reviews
GET    /api/users/:id/stats  // Total sales, rating, etc.

// Games (from BGG integration)
GET    /api/games/search?q=settlers
GET    /api/games/:id
GET    /api/games/popular
GET    /api/games/recent

// Listings
GET    /api/listings?filters
GET    /api/listings/:id
POST   /api/listings
PATCH  /api/listings/:id
DELETE /api/listings/:id
POST   /api/listings/:id/images
POST   /api/listings/:id/view  // Increment view count

// Transactions
POST   /api/transactions        // Create purchase
GET    /api/transactions/:id
PATCH  /api/transactions/:id    // Update status (shipped, delivered, etc.)
POST   /api/transactions/:id/dispute

// Reviews
POST   /api/reviews
GET    /api/reviews/:id

// Search
GET    /api/search?q=catan&condition=veryGood&priceMax=50&location=Riga

// Saved Items (Wishlist)
GET    /api/saved
POST   /api/saved/:listingId
DELETE /api/saved/:listingId
```

## Implementation Timeline

**Week 1-2: Design System Foundation**
- Set up monorepo structure
- Implement all design tokens
- Configure Tailwind with custom theme
- Create token documentation pages

**Week 3-4: Core Components**
- Build Button, Card, Badge, Input components
- Add TypeScript types and variants
- Create component documentation pages
- Write usage guidelines

**Week 5-6: Marketplace Patterns**
- Build GameCard composite component
- Create seller profile pattern
- Design condition display system
- Document marketplace-specific patterns

**Week 7-8: Design System Site Polish**
- Add live component previews
- Create interactive examples
- Write comprehensive usage guidelines
- Deploy to production

**Week 9-12: Backend Foundation**
- Set up Node.js backend
- Implement authentication system
- Create database schema
- Build core API endpoints

**Week 13-16: Marketplace Features**
- Integrate with BoardGameGeek API
- Implement listing creation flow
- Add search and filters
- Build transaction/escrow system

**Week 17-20: Frontend Marketplace**
- Build marketplace pages using design system
- Implement responsive layouts
- Add dark mode support
- Optimize performance

## Critical Success Factors

**Consistency is Trust:** Your design system's value comes from consistent application. Every button should look identical. Every card should follow the same pattern. Baltic users expect digital products to be reliable and predictable.

**Documentation Drives Adoption:** The design system site isn't just pretty—it's the source of truth that enables you (and future team members) to build quickly without design decisions every time. Invest heavily in documentation.

**Performance Equals Professionalism:** Baltic users expect snappy interfaces because of regional tech leaders like Skype and Wise. Your site should feel instant. Optimize images, minimize JavaScript bundles, use code splitting.

**Accessibility Builds Trust:** Proper semantic HTML, ARIA labels, keyboard navigation, and focus states aren't optional. They signal technical competence and inclusivity—both valued in Nordic culture.

**Start Simple, Iterate Based on Reality:** Build MVP with core features first. Don't build complex filtering until you have 100+ listings. Don't build advanced seller analytics until you have 50+ sellers. Let real usage guide expansion.

## Final Philosophy

This design system embodies the Second Turn philosophy: thoughtful curation over endless options, quality over quantity, sustainability through reuse rather than disposal. Your design tokens limit choices not to constrain but to elevate—every decision has been made once, correctly, so you can focus on building great experiences.

The Nordic aesthetic isn't cold minimalism—it's warm minimalism that respects users' time and intelligence. Every pixel serves purpose. Every component earns its place. Every pattern solves real problems.

Build this design system first because it's your foundation. A marketplace built on solid design principles will grow naturally and gracefully. A marketplace built without design discipline will accumulate technical and visual debt that becomes harder to address as you scale.

Remember: board game enthusiasts appreciate craft, quality, and attention to detail. They'll notice if your marketplace feels thoughtfully designed. They'll trust you with their money and their beloved games if you demonstrate that same care in every interaction.

Make every game deserve a second turn by making every design decision worthy of the first.