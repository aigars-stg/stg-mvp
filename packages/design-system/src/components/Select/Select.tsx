'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Select variants matching Input component for consistency.
 *
 * Design philosophy:
 * - Matches Input component styling exactly
 * - Keyboard navigation with arrow keys and Enter
 * - 44px minimum height for accessibility
 * - Frost ice focus ring and hover states
 */
const selectVariants = cva(
  'flex w-full rounded-md border-2 bg-bg-elevated px-3 py-2 text-base transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-border focus-visible:border-frost-ice hover:border-border-strong',
        error: 'border-aurora-red focus-visible:border-aurora-red',
      },
      selectSize: {
        sm: 'h-9 text-sm',        // 36px
        md: 'h-11 text-base',     // 44px touch target
        lg: 'h-12 text-lg',       // 48px comfortable
      },
    },
    defaultVariants: {
      variant: 'default',
      selectSize: 'md',
    },
  }
);

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof selectVariants> {
  /**
   * Label text displayed above the select.
   */
  label?: string;

  /**
   * Error message displayed below the select.
   * When provided, automatically sets variant to 'error'.
   */
  error?: string;

  /**
   * Helper text displayed below the select when no error present.
   */
  helperText?: string;

  /**
   * Array of options to display in the dropdown.
   */
  options: SelectOption[];

  /**
   * Currently selected value.
   */
  value?: string;

  /**
   * Callback when selection changes.
   */
  onChange?: (value: string) => void;

  /**
   * Placeholder text when no selection is made.
   */
  placeholder?: string;

  /**
   * Whether the select is disabled.
   */
  disabled?: boolean;
}

/**
 * Select component - dropdown for filters and forms.
 *
 * Design principles:
 * - Matches Input component styling for consistency
 * - Keyboard accessible (arrow keys, Enter, Escape)
 * - 44px minimum height for touch accessibility
 * - Frost blue focus states for trust and clarity
 *
 * @example
 * ```tsx
 * <Select
 *   label="Condition"
 *   options={[
 *     { value: 'likeNew', label: '📦 Like New' },
 *     { value: 'veryGood', label: '✨ Very Good' },
 *   ]}
 *   value={condition}
 *   onChange={setCondition}
 * />
 * ```
 */
export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({
    className,
    variant,
    selectSize,
    label,
    error,
    helperText,
    options,
    value,
    onChange,
    placeholder = 'Select an option...',
    disabled,
    id,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);
    const selectId = id || `select-${React.useId()}`;
    const effectiveVariant = error ? 'error' : variant;

    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setFocusedIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            onChange?.(options[focusedIndex].value);
            setIsOpen(false);
            setFocusedIndex(-1);
          } else {
            setIsOpen(true);
            setFocusedIndex(value ? options.findIndex(opt => opt.value === value) : 0);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(value ? options.findIndex(opt => opt.value === value) : 0);
          } else {
            setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;

        default:
          break;
      }
    };

    const handleOptionClick = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setFocusedIndex(-1);
    };

    return (
      <div ref={ref} className="w-full" {...props}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
          </label>
        )}

        <div ref={selectRef} className="relative">
          {/* Select trigger */}
          <div
            id={selectId}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${selectId}-listbox`}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                ? `${selectId}-helper`
                : undefined
            }
            tabIndex={disabled ? -1 : 0}
            className={clsx(
              selectVariants({ variant: effectiveVariant, selectSize }),
              'flex items-center justify-between',
              className
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
          >
            <span className={selectedOption ? 'text-text' : 'text-sm text-text-muted'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>

            {/* Chevron icon */}
            <svg
              className={clsx(
                'w-5 h-5 text-text-muted transition-transform',
                isOpen && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div
              id={`${selectId}-listbox`}
              role="listbox"
              className="absolute z-50 w-full mt-2 bg-bg-elevated border-2 border-border rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  className={clsx(
                    'px-3 py-2 cursor-pointer transition-colors',
                    option.value === value && 'bg-frost-ice/10 text-frost-arctic font-medium',
                    option.value !== value && 'text-text hover:bg-snow-stormLight',
                    focusedIndex === index && 'bg-frost-ice/20'
                  )}
                  onClick={() => handleOptionClick(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1.5 text-sm text-aurora-red"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p
            id={`${selectId}-helper`}
            className="mt-1.5 text-sm text-text-secondary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
