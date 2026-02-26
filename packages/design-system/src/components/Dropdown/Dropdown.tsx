'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { clsx } from 'clsx';

// ============================================================================
// Context
// ============================================================================

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
}

// ============================================================================
// Dropdown Root
// ============================================================================

export interface DropdownProps {
  /**
   * Controlled open state.
   */
  open?: boolean;

  /**
   * Callback when open state changes.
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Children (Trigger and Content).
   */
  children: React.ReactNode;
}

/**
 * Dropdown component - a menu that appears on trigger click.
 *
 * @example
 * <Dropdown>
 *   <DropdownTrigger>
 *     <Button>Open Menu</Button>
 *   </DropdownTrigger>
 *   <DropdownContent>
 *     <DropdownItem>Item 1</DropdownItem>
 *     <DropdownItem>Item 2</DropdownItem>
 *     <DropdownSeparator />
 *     <DropdownItem destructive>Delete</DropdownItem>
 *   </DropdownContent>
 * </Dropdown>
 */
export function Dropdown({ open, onOpenChange, children }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const baseId = useId();

  const isOpen = open ?? internalOpen;

  const setIsOpen = useCallback(
    (newOpen: boolean) => {
      if (open === undefined) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [open, onOpenChange]
  );

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        setIsOpen,
        triggerId: `${baseId}-trigger`,
        contentId: `${baseId}-content`,
      }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

// ============================================================================
// DropdownTrigger
// ============================================================================

export interface DropdownTriggerProps {
  /**
   * The element that triggers the dropdown.
   * Should be a single React element (button, etc.).
   */
  children: React.ReactElement;

  /**
   * If true, prevents the dropdown from opening.
   */
  disabled?: boolean;
}

/**
 * The trigger element that opens the dropdown.
 * Wraps a single child element and adds click handling.
 */
export function DropdownTrigger({ children, disabled }: DropdownTriggerProps) {
  const { isOpen, setIsOpen, triggerId, contentId } = useDropdownContext();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return React.cloneElement(children, {
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? contentId : undefined,
    onClick: handleClick,
    disabled,
  });
}

// ============================================================================
// DropdownContent
// ============================================================================

export interface DropdownContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Alignment relative to trigger.
   * @default 'end'
   */
  align?: 'start' | 'center' | 'end';

  /**
   * Side of the trigger to appear on.
   * @default 'bottom'
   */
  side?: 'top' | 'bottom';

  /**
   * Width of the dropdown.
   * - 'auto': fit content
   * - 'trigger': match trigger width
   * - number: fixed width in pixels
   * @default 'auto'
   */
  width?: 'auto' | 'trigger' | number;

  /**
   * If true, closes when clicking outside.
   * @default true
   */
  closeOnClickOutside?: boolean;

  /**
   * If true, closes when pressing Escape.
   * @default true
   */
  closeOnEscape?: boolean;
}

/**
 * The dropdown content container.
 */
export function DropdownContent({
  align = 'end',
  side = 'bottom',
  width = 'auto',
  closeOnClickOutside = true,
  closeOnEscape = true,
  children,
  className,
  ...props
}: DropdownContentProps) {
  const { isOpen, setIsOpen, triggerId, contentId } = useDropdownContext();
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    const handleClickOutside = (e: MouseEvent) => {
      const trigger = document.getElementById(triggerId);
      const content = contentRef.current;

      if (
        content &&
        !content.contains(e.target as Node) &&
        trigger &&
        !trigger.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickOutside, setIsOpen, triggerId]);

  // Close on Escape and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const content = contentRef.current;
      if (!content) return;

      if (e.key === 'Escape' && closeOnEscape) {
        setIsOpen(false);
        document.getElementById(triggerId)?.focus();
        e.preventDefault();
        return;
      }

      if (e.key === 'Tab') {
        setIsOpen(false);
        return;
      }

      const items = Array.from(
        content.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
      );
      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, setIsOpen, triggerId]);

  // Focus first item when dropdown opens
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const firstItem = contentRef.current.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled])'
    );
    firstItem?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
  };

  const widthStyle =
    typeof width === 'number' ? { width: `${width}px` } : width === 'auto' ? {} : {};

  return (
    <div
      ref={contentRef}
      id={contentId}
      role="menu"
      aria-labelledby={triggerId}
      className={clsx(
        'absolute z-50',
        'bg-snow-white rounded-lg shadow-lg border border-border',
        'py-1 min-w-[160px]',
        'animate-in fade-in-0 zoom-in-95',
        alignClasses[align],
        sideClasses[side],
        className
      )}
      style={widthStyle}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// DropdownItem
// ============================================================================

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Icon to display before the label.
   */
  icon?: React.ReactNode;

  /**
   * Description text below the label.
   */
  description?: string;

  /**
   * If true, styles the item as destructive (red).
   */
  destructive?: boolean;

  /**
   * If true, closes the dropdown when clicked.
   * @default true
   */
  closeOnClick?: boolean;
}

/**
 * A single item in the dropdown menu.
 */
export function DropdownItem({
  icon,
  description,
  destructive,
  closeOnClick = true,
  children,
  className,
  onClick,
  disabled,
  ...props
}: DropdownItemProps) {
  const { setIsOpen } = useDropdownContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    if (closeOnClick) {
      setIsOpen(false);
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        'flex items-center gap-3 w-full px-4 py-2 text-sm text-left',
        'transition-colors',
        'focus:outline-none focus:bg-bg-secondary',
        disabled && 'opacity-50 cursor-not-allowed',
        destructive
          ? 'text-aurora-red hover:bg-aurora-red/10'
          : 'text-text hover:bg-bg-secondary',
        className
      )}
      {...props}
    >
      {icon && (
        <span className={clsx('w-4 h-4 flex-shrink-0', destructive ? '' : 'text-frost-ice')}>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className={destructive ? 'text-aurora-red' : 'text-polar-night'}>{children}</div>
        {description && (
          <div className="text-xs text-text-muted mt-0.5">{description}</div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// DropdownLink
// ============================================================================

export interface DropdownLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Icon to display before the label.
   */
  icon?: React.ReactNode;

  /**
   * If true, closes the dropdown when clicked.
   * @default true
   */
  closeOnClick?: boolean;
}

/**
 * A link item in the dropdown menu.
 * Use this instead of DropdownItem when you need an actual anchor tag.
 */
export function DropdownLink({
  icon,
  closeOnClick = true,
  children,
  className,
  onClick,
  ...props
}: DropdownLinkProps) {
  const { setIsOpen } = useDropdownContext();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (closeOnClick) {
      setIsOpen(false);
    }
  };

  return (
    <a
      role="menuitem"
      onClick={handleClick}
      className={clsx(
        'flex items-center gap-3 w-full px-4 py-2 text-sm',
        'text-text hover:bg-bg-secondary transition-colors',
        'focus:outline-none focus:bg-bg-secondary',
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0 text-frost-ice">{icon}</span>}
      <span className="flex-1">{children}</span>
    </a>
  );
}

// ============================================================================
// DropdownSeparator
// ============================================================================

export interface DropdownSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * A visual separator between dropdown items.
 */
export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
  return (
    <div
      role="separator"
      className={clsx('my-1 border-t border-border-subtle', className)}
      {...props}
    />
  );
}

// ============================================================================
// DropdownLabel
// ============================================================================

export interface DropdownLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * A non-interactive label/header for a group of items.
 */
export function DropdownLabel({ children, className, ...props }: DropdownLabelProps) {
  return (
    <div
      className={clsx('px-4 py-2 text-xs font-medium text-text-secondary', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// DropdownGroup
// ============================================================================

export interface DropdownGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional label for the group.
   */
  label?: string;
}

/**
 * A group of related dropdown items with an optional label.
 */
export function DropdownGroup({ label, children, className, ...props }: DropdownGroupProps) {
  return (
    <div role="group" className={className} {...props}>
      {label && <DropdownLabel>{label}</DropdownLabel>}
      {children}
    </div>
  );
}
