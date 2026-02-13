'use client';

import { ReactNode } from 'react';
import { Check, ChevronDown } from '@/lib/icons';

interface CheckoutSectionProps {
  title: string;
  icon: ReactNode;
  isComplete?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  required?: boolean;
  stepNumber?: number;
  collapsedSummary?: ReactNode;
  completeLabel?: string;
  requiredLabel?: string;
}

export function CheckoutSection({
  title,
  icon,
  isComplete,
  isExpanded,
  onToggle,
  children,
  required = false,
  stepNumber,
  collapsedSummary,
  completeLabel = 'Complete',
  requiredLabel = 'Required',
}: CheckoutSectionProps) {
  return (
    <div
      className={`bg-snow-white rounded-xl overflow-hidden transition-colors border ${
        isComplete
          ? 'border-aurora-green/20'
          : 'border-border'
      }`}
    >
      {/* Header — always visible, clickable */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full px-4 sm:px-6 py-4 flex items-center gap-3 hover:bg-bg-secondary/50 transition-colors text-left"
      >
        {/* Icon or checkmark */}
        <div className="flex-shrink-0">
          {isComplete ? (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-aurora-green/10">
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-aurora-green" />
            </div>
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-frost-ice/10">
              {icon}
            </div>
          )}
        </div>

        {/* Title + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {stepNumber !== undefined && (
              <span className="text-xs font-bold text-text-muted bg-bg-secondary rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {stepNumber}
              </span>
            )}
            <h2 className="text-base sm:text-lg font-semibold text-polar-night truncate">
              {title}
            </h2>
            {isComplete && (
              <span className="text-xs font-medium text-aurora-green flex-shrink-0">
                {completeLabel}
              </span>
            )}
            {required && !isComplete && (
              <span className="text-xs font-medium text-text-muted flex-shrink-0">
                {requiredLabel}
              </span>
            )}
          </div>

          {/* Collapsed summary */}
          {!isExpanded && collapsedSummary && (
            <div className="mt-1 text-sm text-text-secondary line-clamp-2">
              {collapsedSummary}
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content — collapsible via CSS grid-rows for smooth animation */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border-subtle pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
