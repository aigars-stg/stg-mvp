'use client';

import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

export interface ModalProps {
  /**
   * Whether the modal is open.
   */
  open: boolean;

  /**
   * Callback when modal should close (clicking backdrop or pressing Escape).
   */
  onClose: () => void;

  /**
   * Modal title displayed in the header.
   */
  title?: string;

  /**
   * Modal content.
   */
  children: React.ReactNode;

  /**
   * Optional footer content (typically action buttons).
   */
  footer?: React.ReactNode;

  /**
   * Modal size variant.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Additional className for the modal container.
   */
  className?: string;

  /**
   * Additional className for the content area.
   * Use to override default max-height or padding.
   */
  contentClassName?: string;
}

/**
 * Modal component - for dialogs, confirmations, and overlays.
 *
 * Design principles:
 * - 16px border radius for elevated overlays
 * - 300ms animation (slow timing for overlays)
 * - Polar night backdrop at 60% opacity
 * - Focus trap - keyboard navigation stays within modal
 * - Escape key closes modal
 *
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Purchase Confirmation"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={() => setIsOpen(false)}>
 *         Cancel
 *       </Button>
 *       <Button variant="primary" onClick={handlePurchase}>
 *         Confirm Purchase
 *       </Button>
 *     </>
 *   }
 * >
 *   <p>Are you sure you want to purchase Catan for €25.00?</p>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
  contentClassName,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store previously focused element and restore on close
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    };
  }, [open]);

  // Trap focus within modal
  useEffect(() => {
    if (!open || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => modal.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-polar-night/60 transition-opacity duration-slow"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centering wrapper */}
      <div className="flex min-h-screen items-start justify-center p-4 py-8">
        {/* Modal container */}
        <div
          ref={modalRef}
          className={clsx(
            'relative bg-bg-elevated rounded-xl shadow-xl w-full',
            'transition-all duration-slow',
            'animate-in fade-in zoom-in-95',
            sizeClasses[size],
            className
          )}
        >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-border-subtle">
            <h2
              id="modal-title"
              className="text-2xl font-semibold text-polar-night"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-frost-ice/30 rounded p-1"
              aria-label="Close modal"
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
        )}

        {/* Content */}
        <div className={clsx('overflow-y-auto max-h-[60vh] p-6', contentClassName)}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border-subtle flex-shrink-0">
            {footer}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
