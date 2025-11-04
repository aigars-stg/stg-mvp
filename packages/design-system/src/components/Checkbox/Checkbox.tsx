import React from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Label text displayed next to the checkbox.
   */
  label?: string;

  /**
   * Helper text displayed below the checkbox.
   */
  helperText?: string;

  /**
   * Error message displayed below the checkbox.
   */
  error?: string;
}

/**
 * Checkbox component - for selections and completeness tracking.
 *
 * Design principles:
 * - Frost ice color when checked (trust color)
 * - 44px minimum clickable area for accessibility
 * - Clear focus ring (3px frost ice at 30% opacity)
 * - Label increases clickable area
 *
 * @example
 * ```tsx
 * <Checkbox
 *   label="All cards present"
 *   checked={allCardsPresent}
 *   onChange={(e) => setAllCardsPresent(e.target.checked)}
 * />
 * ```
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${React.useId()}`;

    return (
      <div className="flex items-start">
        <div className="flex items-center h-11">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            className={clsx(
              'w-5 h-5 rounded border-2 transition-colors',
              'border-border bg-bg-elevated',
              'checked:bg-frost-ice checked:border-frost-ice',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'cursor-pointer',
              error && 'border-aurora-red',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${checkboxId}-error`
                : helperText
                ? `${checkboxId}-helper`
                : undefined
            }
            {...props}
          />
        </div>

        {(label || helperText || error) && (
          <div className="ml-3 flex-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-base font-medium text-text cursor-pointer"
              >
                {label}
              </label>
            )}

            {error && (
              <p
                id={`${checkboxId}-error`}
                className="mt-1 text-sm text-aurora-red"
                role="alert"
              >
                {error}
              </p>
            )}

            {!error && helperText && (
              <p
                id={`${checkboxId}-helper`}
                className="mt-1 text-sm text-text-secondary"
              >
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
