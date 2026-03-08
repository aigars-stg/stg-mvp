'use client';

import { useEffect, ReactNode } from 'react';
import { Card } from '@second-turn/design-system';

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  stepNumber?: number;
  isComplete?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  required?: boolean;
  subtitle?: string;
  disabled?: boolean;
}

function getCardClassName(isExpanded: boolean, isComplete: boolean | undefined, disabled: boolean) {
  const base = 'overflow-hidden transition-all';
  if (disabled) return `${base} border border-border-subtle shadow-none opacity-60`;
  if (isExpanded && !isComplete) return `${base} border border-frost-ice/40 shadow-md`;
  if (isComplete) return `${base} border border-aurora-green/30 shadow-sm`;
  return `${base} border border-border-subtle shadow-sm`;
}

function getIconBgClassName(isExpanded: boolean, isComplete: boolean | undefined, disabled: boolean) {
  const base = 'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0';
  if (disabled) return `${base} bg-bg-secondary text-text-muted`;
  if (isComplete) return `${base} bg-aurora-green/15 text-aurora-green`;
  if (isExpanded) return `${base} bg-frost-ice/15 text-frost-ice ring-1 ring-frost-ice/30`;
  return `${base} bg-bg-secondary text-frost-ice`;
}

export function CollapsibleSection({
  title,
  icon,
  stepNumber,
  isComplete,
  isExpanded,
  onToggle,
  children,
  required = false,
  subtitle,
  disabled = false,
}: CollapsibleSectionProps) {

  // Auto-expand when section becomes incomplete (user needs to complete it)
  useEffect(() => {
    if (isComplete !== undefined && !isComplete && !isExpanded) {
      // Section is incomplete but collapsed - could auto-expand here if needed
    }
  }, [isComplete, isExpanded]);

  const showAccent = isExpanded && !isComplete && !disabled;

  return (
    <Card padding="none" className={getCardClassName(isExpanded, isComplete, disabled)}>
      {/* Active section accent bar */}
      {showAccent && (
        <div className="h-0.5 bg-frost-ice/40" />
      )}

      {/* Section Header - Always visible, clickable */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`w-full px-4 sm:px-6 py-3 flex items-center justify-between transition-colors text-left ${
          disabled
            ? 'cursor-not-allowed'
            : 'hover:bg-bg-secondary/50 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={getIconBgClassName(isExpanded, isComplete, disabled)}>
            {isComplete ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : stepNumber ? (
              <span className="text-sm font-bold">{stepNumber}</span>
            ) : (
              icon
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-text">
                {title}
                {required && <span className="text-aurora-red ml-1">*</span>}
              </h2>
            </div>
            {subtitle && (isComplete === undefined || !isComplete) && (
              <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <svg
          className={`w-5 h-5 text-text-muted transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Section Content - Collapsible */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-h-[5000px] opacity-100'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border-subtle">
          {children}
        </div>
      </div>
    </Card>
  );
}
