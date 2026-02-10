import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Card variants for different use cases in the marketplace.
 *
 * Design philosophy:
 * - Cards use 12px border radius (warm but not childish)
 * - Shadows are subtle using Nordic polar night colors
 * - Interactive cards show frost.ice border on hover for trust
 * - All cards follow the 8-point grid for padding
 */
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
    VariantProps<typeof cardVariants> {}

/**
 * Card component - container for game listings and content blocks.
 *
 * Design principles:
 * - 12px border radius for friendly warmth
 * - Subtle shadows (Nordic restraint, not Material Design drama)
 * - Interactive variant shows trust blue border on hover
 * - Follows 8-point grid for all padding values
 *
 * @example
 * ```tsx
 * <Card variant="interactive" onClick={handleGameClick}>
 *   <CardHeader>
 *     <CardTitle>Catan</CardTitle>
 *     <CardDescription>Klaus Teuber • 1995</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Game details...
 *   </CardContent>
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(cardVariants({ variant, padding }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader - container for card title and description.
 * Uses 8-point grid spacing (space-y-1.5 = 6px).
 */
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - main heading for the card.
 * Uses 20px font size (xl) with semibold weight for Nordic clarity.
 */
export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={clsx('font-semibold text-xl leading-tight tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

/**
 * CardDescription - secondary text for the card.
 * Uses 14px font size (sm) with muted text color.
 */
export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx('text-sm text-text-secondary', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

/**
 * CardContent - main content area of the card.
 * No top padding (pt-0) to maintain visual hierarchy.
 */
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx('pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

/**
 * CardFooter - footer area for actions or metadata.
 * Uses flexbox for horizontal layout of buttons/actions.
 */
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex items-center pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
