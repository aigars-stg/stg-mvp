'use client';

import React, { useRef } from 'react';
import { clsx } from 'clsx';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface SlidePanelProps {
  /**
   * Whether the panel is open.
   */
  open: boolean;

  /**
   * Callback when panel should close (clicking backdrop or pressing Escape).
   */
  onClose: () => void;

  /**
   * Panel title displayed in the header.
   */
  title?: string;

  /**
   * Panel content.
   */
  children: React.ReactNode;

  /**
   * Panel size variant.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional className for the panel container.
   */
  className?: string;
}

/**
 * SlidePanel component - slides in from the right on desktop, bottom on mobile.
 *
 * Perfect for forms and detailed views with lots of content.
 *
 * - Slides from right on desktop (md+)
 * - Slides from bottom on mobile
 * - Full height, naturally scrollable
 * - 300ms animation (slow timing)
 *
 * @example
 * ```tsx
 * <SlidePanel
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Offer Details"
 *   size="md"
 * >
 *   <form>...</form>
 * </SlidePanel>
 * ```
 */
export const SlidePanel: React.FC<SlidePanelProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  className,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, onClose);

  if (!open) return null;

  const sizeClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'panel-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-polar-night/60 transition-opacity duration-slow"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - slides from right on desktop, bottom on mobile */}
      <div
        ref={panelRef}
        className={clsx(
          'fixed bg-bg-elevated shadow-xl w-full h-full overflow-y-auto',
          // Mobile: slide from bottom
          'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-xl',
          'animate-in slide-in-from-bottom duration-slow',
          // Desktop: slide from right, full height
          'md:top-0 md:right-0 md:bottom-0 md:left-auto md:max-h-none md:rounded-none md:rounded-l-xl',
          'md:animate-in md:slide-in-from-right',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-elevated border-b border-border-subtle">
          <div className="flex items-center justify-between p-4 md:p-6">
            <h2
              id="panel-title"
              className="text-xl md:text-2xl font-semibold text-polar-night"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 rounded p-1"
              aria-label="Close panel"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - naturally scrollable */}
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
};

SlidePanel.displayName = 'SlidePanel';
