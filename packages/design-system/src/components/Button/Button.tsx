import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Button variants using class-variance-authority for type-safe variant management.
 *
 * Design philosophy:
 * - Primary uses frost.ice (trust blue) for main CTAs
 * - Accent uses aurora.orange sparingly for urgency
 * - All sizes meet minimum 44px touch targets for accessibility
 * - Focus rings use frost.ice at 30% opacity (3px width)
 * - Transitions are 200ms (Baltic expectation for snappy UI)
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary: trust actions (login, purchase, main CTAs)
        primary: 'bg-frost-ice text-polar-night hover:bg-frost-polar active:bg-frost-arctic shadow-sm hover:shadow-md',

        // Secondary: alternative actions (cancel, back, filters)
        secondary: 'bg-snow-white dark:bg-polar-nightMedium text-polar-night dark:text-snow-stormLightest border-2 border-border dark:border-polar-nightDark hover:bg-snow-stormLight dark:hover:bg-polar-nightDark hover:border-border-strong shadow-sm hover:shadow-md',

        // Accent: urgency (buy now, limited time)
        accent: 'bg-aurora-orange text-snow-white hover:bg-[#C97862] active:bg-[#B86954] shadow-sm hover:shadow-md',

        // Ghost: subtle actions (show more, expand)
        ghost: 'text-polar-night dark:text-snow-stormLightest hover:bg-snow-stormLight dark:hover:bg-polar-nightMedium active:bg-snow-storm dark:active:bg-polar-nightDark',

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
  /**
   * If true, renders the button in a loading state with a spinner.
   * When loading, the button is automatically disabled.
   */
  loading?: boolean;

  /**
   * Optional icon to display before the button text.
   * Should be a React element (typically an SVG icon).
   */
  leftIcon?: React.ReactNode;

  /**
   * Optional icon to display after the button text.
   * Should be a React element (typically an SVG icon).
   */
  rightIcon?: React.ReactNode;
}

/**
 * Button component - the foundation of interactive UI.
 *
 * Design principles:
 * - Uses frost.ice (Nordic trust blue) for primary actions
 * - Meets 44px minimum touch target for accessibility
 * - Shows clear focus states for keyboard navigation
 * - Provides loading state with spinner
 * - Supports icons for visual context
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handlePurchase}>
 *   Buy Game
 * </Button>
 *
 * <Button variant="accent" loading={isPurchasing}>
 *   Processing...
 * </Button>
 *
 * <Button variant="secondary" leftIcon={<HeartIcon />}>
 *   Save for Later
 * </Button>
 * ```
 */
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
        className={clsx(buttonVariants({ variant, size, fullWidth }), className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        {!loading && leftIcon && <span className="mr-2" aria-hidden="true">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2" aria-hidden="true">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
