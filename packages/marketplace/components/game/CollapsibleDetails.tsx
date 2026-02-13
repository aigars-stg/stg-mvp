'use client';

import { ReactNode } from 'react';
import { ChevronDown } from '@/lib/icons';

interface CollapsibleDetailsProps {
  /** Section title */
  title: string;
  /** Icon to display next to title */
  icon?: ReactNode;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Callback when header is clicked */
  onToggle: () => void;
  /** Section content */
  children: ReactNode;
  /** Optional badge to show next to title (e.g., count) */
  badge?: ReactNode;
  /** Optional subtitle shown below title when collapsed */
  subtitle?: string;
}

/**
 * Collapsible section for OfferCard details.
 * Simpler than CollapsibleSection - no Card wrapper, inline styling.
 */
export function CollapsibleDetails({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  badge,
  subtitle,
}: CollapsibleDetailsProps) {
  return (
    <div className="border-b border-border-subtle last:border-b-0">
      {/* Header - Always visible, clickable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && <div className="flex-shrink-0 text-text-muted">{icon}</div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-polar-night">{title}</span>
              {badge}
            </div>
            {subtitle && !isExpanded && (
              <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content - Collapsible */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 sm:px-4 pb-3">{children}</div>
      </div>
    </div>
  );
}
