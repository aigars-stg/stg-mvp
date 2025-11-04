import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Input variants for different states.
 *
 * Design philosophy:
 * - 2px border for visual clarity (technical precision)
 * - 44px height for accessibility (minimum touch target)
 * - Frost blue focus ring (3px at 30% opacity)
 * - Error states use aurora red
 * - 8px border radius matches buttons for consistency
 */
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
  /**
   * Label text displayed above the input.
   * Automatically linked to input via htmlFor for accessibility.
   */
  label?: string;

  /**
   * Error message displayed below the input.
   * When provided, automatically sets variant to 'error'.
   */
  error?: string;

  /**
   * Helper text displayed below the input when no error present.
   * Useful for format hints or requirements.
   */
  helperText?: string;

  /**
   * Icon displayed on the left side of the input.
   * Commonly used for search icons, currency symbols, etc.
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon displayed on the right side of the input.
   * Commonly used for visibility toggles, clear buttons, etc.
   */
  rightIcon?: React.ReactNode;
}

/**
 * Input component - for forms and user data entry.
 *
 * Design principles:
 * - 44px minimum height for touch accessibility
 * - Frost blue focus ring for trust and clarity
 * - Labels always visible (no floating labels - Nordic clarity)
 * - Error states clearly communicated with color and text
 * - Icons for visual context without cluttering
 *
 * @example
 * ```tsx
 * // Basic input with label
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="your@email.com"
 * />
 *
 * // Input with error
 * <Input
 *   label="Password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 * />
 *
 * // Input with icon
 * <Input
 *   label="Search"
 *   leftIcon={<SearchIcon />}
 *   placeholder="Search games..."
 * />
 * ```
 */
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
    // Generate unique ID if not provided (for label-input association)
    const inputId = id || `input-${React.useId()}`;
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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            className={clsx(
              inputVariants({
                variant: effectiveVariant,
                inputSize,
              }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
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
            role="alert"
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
