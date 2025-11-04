import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Badge variants for condition indicators and trust signals.
 *
 * Design philosophy:
 * - Condition badges use carefully designed color combinations
 * - Each condition feels friendly, not judgmental
 * - Trust badges use frost colors for verification
 * - 24px border radius creates friendly pill shapes
 * - Minimal use of green to avoid greenwashing association
 */
const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors',
  {
    variants: {
      variant: {
        // Trust and verification badges
        trust: 'bg-frost-ice/10 text-frost-arctic border border-frost-ice/30',

        // Condition badges (special marketplace need)
        // Like New: pristine, barely touched
        likeNew: 'bg-condition-likeNew-bg text-condition-likeNew-text border border-condition-likeNew-border',

        // Very Good: minor wear, excellent play condition
        veryGood: 'bg-condition-veryGood-bg text-condition-veryGood-text border border-condition-veryGood-border',

        // Good: visible wear, components intact
        good: 'bg-condition-good-bg text-condition-good-text border border-condition-good-border',

        // Acceptable: significant wear, playable
        acceptable: 'bg-condition-acceptable-bg text-condition-acceptable-text border border-condition-acceptable-border',

        // For Parts: incomplete, salvage value
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
  /**
   * Optional icon to display before the badge text.
   * Commonly used for verification checkmarks or condition emojis.
   */
  icon?: React.ReactNode;
}

/**
 * Badge component - for condition indicators and trust signals.
 *
 * Design principles:
 * - Condition colors make used games feel approachable, not shameful
 * - Trust badges use frost blue for verification credibility
 * - 24px border radius creates friendly pill shapes
 * - Green used sparingly (only for success states, not primary branding)
 *
 * @example
 * ```tsx
 * // Condition badge on game card
 * <Badge variant="veryGood">✨ Very Good</Badge>
 *
 * // Trust badge for verified seller
 * <Badge variant="trust" icon={<CheckIcon />}>
 *   Verified Seller
 * </Badge>
 *
 * // Success state
 * <Badge variant="success">Payment Confirmed</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {icon && <span className="mr-1.5" aria-hidden="true">{icon}</span>}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
