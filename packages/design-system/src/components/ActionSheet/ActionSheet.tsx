'use client';

import { useRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// ============================================================================
// Icons
// ============================================================================

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ============================================================================
// ActionSheet Root
// ============================================================================

export interface ActionSheetProps {
  /**
   * Whether the action sheet is open.
   */
  isOpen: boolean;

  /**
   * Callback when the sheet should close.
   */
  onClose: () => void;

  /**
   * Optional title displayed in the header.
   */
  title?: string;

  /**
   * Content to render inside the sheet.
   */
  children: ReactNode;

  /**
   * Whether to show the close button in the header.
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Maximum height of the sheet as percentage of viewport.
   * @default 85
   */
  maxHeightVh?: number;

  /**
   * Additional class names for the sheet container.
   */
  className?: string;
}

/**
 * ActionSheet component - a mobile-optimized bottom sheet.
 *
 * @example
 * // Basic usage
 * <ActionSheet isOpen={isOpen} onClose={onClose} title="Choose an option">
 *   <ActionSheetItem onClick={handleOption1}>Option 1</ActionSheetItem>
 *   <ActionSheetItem onClick={handleOption2}>Option 2</ActionSheetItem>
 *   <ActionSheetCancel onClick={onClose}>Cancel</ActionSheetCancel>
 * </ActionSheet>
 *
 * @example
 * // With custom content
 * <ActionSheet isOpen={isOpen} onClose={onClose} title="Select Game">
 *   <div className="p-4">
 *     <p>Custom content goes here</p>
 *   </div>
 * </ActionSheet>
 */
export function ActionSheet({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  maxHeightVh = 85,
  className,
}: ActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, sheetRef, onClose);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'action-sheet-title' : undefined}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-50 bg-snow-white rounded-t-2xl shadow-2xl flex flex-col',
          'animate-in slide-in-from-bottom duration-300',
          className
        )}
        style={{
          maxHeight: `${maxHeightVh}vh`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border-subtle rounded-full" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle flex-shrink-0">
            {title && (
              <h2 id="action-sheet-title" className="text-lg font-semibold text-polar-night">
                {title}
              </h2>
            )}
            {!title && <div />}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
                aria-label="Close"
              >
                <CloseIcon className="w-5 h-5 text-text-muted" />
              </button>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

// ============================================================================
// ActionSheetSection
// ============================================================================

export interface ActionSheetSectionProps {
  /**
   * Optional label for the section.
   */
  label?: string;

  /**
   * Content of the section.
   */
  children: ReactNode;

  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * A section within an ActionSheet, optionally with a label.
 */
export function ActionSheetSection({ label, children, className }: ActionSheetSectionProps) {
  return (
    <div className={clsx('py-2', className)}>
      {label && (
        <div className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// ActionSheetItem
// ============================================================================

export interface ActionSheetItemProps {
  /**
   * Click handler for the item.
   */
  onClick?: () => void;

  /**
   * Optional icon to display before the text.
   */
  icon?: ReactNode;

  /**
   * Optional description text below the main text.
   */
  description?: string;

  /**
   * Optional badge/count to display on the right.
   */
  badge?: ReactNode;

  /**
   * Color accent for the icon.
   * @default 'frost'
   */
  color?: 'frost' | 'orange' | 'red' | 'green' | 'muted';

  /**
   * Whether to show a chevron arrow on the right.
   * @default false
   */
  showChevron?: boolean;

  /**
   * Whether the item is disabled.
   */
  disabled?: boolean;

  /**
   * The text content of the item.
   */
  children: ReactNode;

  /**
   * Additional class names.
   */
  className?: string;
}

const itemColorClasses = {
  frost: {
    icon: 'text-frost-ice',
    iconBg: 'bg-frost-ice/10 group-hover:bg-frost-ice/20',
    badge: 'bg-frost-ice/10 text-frost-ice',
  },
  orange: {
    icon: 'text-aurora-orange',
    iconBg: 'bg-aurora-orange/10 group-hover:bg-aurora-orange/20',
    badge: 'bg-aurora-orange/10 text-aurora-orange',
  },
  red: {
    icon: 'text-aurora-red',
    iconBg: 'bg-aurora-red/10 group-hover:bg-aurora-red/20',
    badge: 'bg-aurora-red/10 text-aurora-red',
  },
  green: {
    icon: 'text-aurora-green',
    iconBg: 'bg-aurora-green/10 group-hover:bg-aurora-green/20',
    badge: 'bg-aurora-green/10 text-aurora-green',
  },
  muted: {
    icon: 'text-text-muted',
    iconBg: 'bg-bg-elevated',
    badge: 'bg-bg-elevated text-text-secondary',
  },
};

/**
 * An action item within an ActionSheet.
 */
export function ActionSheetItem({
  onClick,
  icon,
  description,
  badge,
  color = 'frost',
  showChevron = false,
  disabled = false,
  children,
  className,
}: ActionSheetItemProps) {
  const colors = itemColorClasses[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors group',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className={clsx('w-5 h-5', colors.icon)}>{icon}</span>
        )}
        <div className="text-left">
          <span className="text-polar-night font-medium">{children}</span>
          {description && (
            <p className="text-sm text-text-secondary">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span
            className={clsx(
              'text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center',
              colors.badge
            )}
          >
            {badge}
          </span>
        )}
        {showChevron && (
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        )}
      </div>
    </button>
  );
}

// ============================================================================
// ActionSheetCard
// ============================================================================

export interface ActionSheetCardProps {
  /**
   * Click handler for the card.
   */
  onClick?: () => void;

  /**
   * Icon to display in the card.
   */
  icon: ReactNode;

  /**
   * Title text.
   */
  title: string;

  /**
   * Description text.
   */
  description: string;

  /**
   * Color accent.
   * @default 'frost'
   */
  color?: 'frost' | 'orange' | 'red' | 'green';

  /**
   * Whether the card is disabled.
   */
  disabled?: boolean;

  /**
   * Additional class names.
   */
  className?: string;
}

const cardColorClasses = {
  frost: {
    border: 'hover:border-frost-ice',
    bg: 'hover:bg-frost-ice/5',
    iconBg: 'bg-frost-ice/10 group-hover:bg-frost-ice/20',
    icon: 'text-frost-ice',
    title: 'group-hover:text-frost-ice',
    chevron: 'group-hover:text-frost-ice',
  },
  orange: {
    border: 'hover:border-aurora-orange',
    bg: 'hover:bg-aurora-orange/5',
    iconBg: 'bg-aurora-orange/10 group-hover:bg-aurora-orange/20',
    icon: 'text-aurora-orange',
    title: 'group-hover:text-aurora-orange',
    chevron: 'group-hover:text-aurora-orange',
  },
  red: {
    border: 'hover:border-aurora-red',
    bg: 'hover:bg-aurora-red/5',
    iconBg: 'bg-aurora-red/10 group-hover:bg-aurora-red/20',
    icon: 'text-aurora-red',
    title: 'group-hover:text-aurora-red',
    chevron: 'group-hover:text-aurora-red',
  },
  green: {
    border: 'hover:border-aurora-green',
    bg: 'hover:bg-aurora-green/5',
    iconBg: 'bg-aurora-green/10 group-hover:bg-aurora-green/20',
    icon: 'text-aurora-green',
    title: 'group-hover:text-aurora-green',
    chevron: 'group-hover:text-aurora-green',
  },
};

/**
 * A card-style action item for prominent actions.
 * Use this for primary actions like "Sell a Game" or "Post Wanted".
 */
export function ActionSheetCard({
  onClick,
  icon,
  title,
  description,
  color = 'frost',
  disabled = false,
  className,
}: ActionSheetCardProps) {
  const colors = cardColorClasses[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border transition-all group',
        colors.border,
        colors.bg,
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent',
        className
      )}
    >
      <div
        className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          colors.iconBg
        )}
      >
        <span className={clsx('w-6 h-6', colors.icon)}>{icon}</span>
      </div>
      <div className="text-left flex-1">
        <div
          className={clsx(
            'font-semibold text-polar-night transition-colors',
            colors.title
          )}
        >
          {title}
        </div>
        <div className="text-sm text-text-secondary">{description}</div>
      </div>
      <ChevronRightIcon
        className={clsx('w-5 h-5 text-text-muted transition-colors', colors.chevron)}
      />
    </button>
  );
}

// ============================================================================
// ActionSheetCancel
// ============================================================================

export interface ActionSheetCancelProps {
  /**
   * Click handler for the cancel button.
   */
  onClick: () => void;

  /**
   * Text to display.
   * @default 'Cancel'
   */
  children?: ReactNode;

  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Cancel button for the ActionSheet.
 * Typically placed at the bottom.
 */
export function ActionSheetCancel({
  onClick,
  children = 'Cancel',
  className,
}: ActionSheetCancelProps) {
  return (
    <div className={clsx('p-4 border-t border-border-subtle', className)}>
      <button
        onClick={onClick}
        className="w-full py-3 px-4 bg-bg-elevated hover:bg-border-subtle text-polar-night font-medium rounded-lg transition-colors"
      >
        {children}
      </button>
    </div>
  );
}

// ============================================================================
// ActionSheetDivider
// ============================================================================

export interface ActionSheetDividerProps {
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * A horizontal divider for separating sections.
 */
export function ActionSheetDivider({ className }: ActionSheetDividerProps) {
  return <div className={clsx('border-t border-border-subtle', className)} />;
}
