import React from 'react';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * ResultPage — full-page result layout for success, error, warning, and info states.
 *
 * Design philosophy:
 * - Colored header banner sets emotional tone immediately
 * - Icon circle provides visual anchor at mobile and desktop sizes
 * - Content area uses max-w-4xl for focused reading
 * - Actions grid adapts from stacked (mobile) to side-by-side (desktop)
 */

const headerVariants = cva(
  'w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex flex-col items-center text-center border-b',
  {
    variants: {
      variant: {
        success: 'bg-aurora-green/5 border-aurora-green/20',
        error: 'bg-aurora-red/5 border-aurora-red/20',
        warning: 'bg-aurora-yellow/5 border-aurora-yellow/20',
        info: 'bg-frost-ice/5 border-frost-ice/20',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconCircleVariants = cva(
  'w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 sm:mb-5',
  {
    variants: {
      variant: {
        success: 'bg-aurora-green/20 text-aurora-green',
        error: 'bg-aurora-red/20 text-aurora-red',
        warning: 'bg-aurora-yellow/20 text-aurora-yellow',
        info: 'bg-frost-ice/20 text-frost-ice',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

type ResultVariant = 'success' | 'error' | 'warning' | 'info';

export interface ResultPageProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: ResultVariant;
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  fullHeight?: boolean;
}

/**
 * Full-page result layout with colored header, content area, and action buttons.
 *
 * @example
 * ```tsx
 * <ResultPage
 *   variant="error"
 *   icon={<AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />}
 *   title="Payment Declined"
 *   description="Your bank did not approve this transaction."
 * >
 *   <ResultPage.Content>
 *     <div>Suggestion cards...</div>
 *   </ResultPage.Content>
 *   <ResultPage.Actions>
 *     <button>Try Again</button>
 *     <button>Back to Cart</button>
 *   </ResultPage.Actions>
 * </ResultPage>
 * ```
 */
const ResultPageRoot = React.forwardRef<HTMLDivElement, ResultPageProps>(
  ({ className, variant, icon, title, description, badge, fullHeight = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col bg-bg',
          fullHeight ? 'min-h-screen' : 'min-h-[60vh]',
          className
        )}
        {...props}
      >
        {/* Header banner */}
        <div className={headerVariants({ variant })}>
          <div className={iconCircleVariants({ variant })}>
            {icon}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-heading">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-md">
              {description}
            </p>
          )}
          {badge && (
            <div className="mt-3">
              {badge}
            </div>
          )}
        </div>

        {/* Children (Content + Actions) */}
        {children}
      </div>
    );
  }
);

ResultPageRoot.displayName = 'ResultPage';

/**
 * ResultPage.Content — container for cards, info banners, and details between header and actions.
 */
const ResultPageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6',
      className
    )}
    {...props}
  />
));

ResultPageContent.displayName = 'ResultPageContent';

/**
 * ResultPage.Actions — grid container for action buttons (stacked on mobile, side-by-side on desktop).
 */
const ResultPageActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'w-full max-w-4xl mx-auto px-4 sm:px-6 pb-8 grid sm:grid-cols-2 gap-3',
      className
    )}
    {...props}
  />
));

ResultPageActions.displayName = 'ResultPageActions';

// Compose as dot-notation API
export const ResultPage = Object.assign(ResultPageRoot, {
  Content: ResultPageContent,
  Actions: ResultPageActions,
});

export type { ResultVariant };
