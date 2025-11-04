'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Card } from '@second-turn/design-system';

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  isComplete: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  required?: boolean;
  subtitle?: string;
}

export function CollapsibleSection({
  title,
  icon,
  isComplete,
  isExpanded,
  onToggle,
  children,
  required = false,
  subtitle,
}: CollapsibleSectionProps) {
  // Auto-expand when section becomes incomplete (user needs to complete it)
  useEffect(() => {
    if (!isComplete && !isExpanded) {
      // Section is incomplete but collapsed - could auto-expand here if needed
    }
  }, [isComplete, isExpanded]);

  return (
    <Card padding="none" className="overflow-hidden transition-all border-2 border-border">
      {/* Section Header - Always visible, clickable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-text">
                {title}
                {required && <span className="text-aurora-red ml-1">*</span>}
              </h2>
              {isComplete && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-frost-ice">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Complete
                </span>
              )}
            </div>
            {subtitle && !isComplete && (
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
        <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-border-subtle">
          {children}
        </div>
      </div>
    </Card>
  );
}
