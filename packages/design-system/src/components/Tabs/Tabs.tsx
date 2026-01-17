'use client';

import { createContext, useContext, useState, useCallback, useId } from 'react';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';

// ============================================================================
// Context
// ============================================================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: TabsProps['variant'];
  size: TabsProps['size'];
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
}

// ============================================================================
// Tabs Root
// ============================================================================

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The controlled value of the active tab.
   * Use with `onValueChange` for controlled mode.
   */
  value?: string;

  /**
   * The default active tab for uncontrolled mode.
   */
  defaultValue?: string;

  /**
   * Callback when the active tab changes.
   */
  onValueChange?: (value: string) => void;

  /**
   * Visual variant of the tabs.
   * - `default`: Standard tabs with underline indicator
   * - `toggle`: Pill-shaped toggle buttons in a container
   * - `pills`: Separate pill buttons
   * - `cards`: Card-like buttons with icons
   */
  variant?: 'default' | 'toggle' | 'pills' | 'cards';

  /**
   * Size variant.
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Tabs component - a tabbed interface for switching between views.
 *
 * @example
 * // Basic usage
 * <Tabs defaultValue="tab1">
 *   <TabsList>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">Content 1</TabsContent>
 *   <TabsContent value="tab2">Content 2</TabsContent>
 * </Tabs>
 *
 * @example
 * // Toggle variant
 * <Tabs variant="toggle" defaultValue="sell">
 *   <TabsList>
 *     <TabsTrigger value="sell">For Sale</TabsTrigger>
 *     <TabsTrigger value="wanted">Wanted</TabsTrigger>
 *   </TabsList>
 * </Tabs>
 */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant = 'default',
  size = 'md',
  children,
  className,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const baseId = useId();

  const activeTab = value ?? internalValue;

  const setActiveTab = useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [value, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size, baseId }}>
      <div className={clsx('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ============================================================================
// TabsList
// ============================================================================

const tabsListVariants = cva('flex', {
  variants: {
    variant: {
      default: 'border-b border-border-subtle gap-1',
      toggle: 'inline-flex rounded-lg border border-border p-0.5 bg-snow-white/80 shadow-sm',
      pills: 'flex-wrap gap-2',
      cards: 'flex-col sm:flex-row gap-2 sm:gap-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Container for tab triggers.
 */
export function TabsList({ children, className, ...props }: TabsListProps) {
  const { variant } = useTabsContext();

  return (
    <div
      role="tablist"
      className={clsx(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// TabsTrigger
// ============================================================================

const triggerBaseStyles =
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost-ice focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const triggerVariants = {
  default: {
    base: 'px-4 py-2 relative',
    active: 'text-frost-ice',
    inactive: 'text-text-secondary hover:text-text',
    indicator: 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-frost-ice',
  },
  toggle: {
    base: 'px-4 py-1.5 rounded-md text-sm',
    active: 'bg-frost-ice text-snow-white shadow-sm',
    inactive: 'text-text-secondary hover:text-text',
    indicator: '',
  },
  pills: {
    base: 'px-4 py-2 rounded-lg',
    active: 'bg-frost-ice text-snow-white',
    inactive: 'bg-bg-elevated text-text-secondary hover:bg-border',
    indicator: '',
  },
  cards: {
    base: 'px-4 sm:px-6 py-3 rounded-lg shadow-sm flex-1 sm:flex-initial',
    active: 'bg-frost-ice text-snow-white shadow-md',
    inactive: 'bg-snow-white text-polar-night hover:bg-bg-secondary border border-border',
    indicator: '',
  },
};

const triggerSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The value that identifies this tab.
   */
  value: string;

  /**
   * Optional icon to display before the text.
   */
  icon?: React.ReactNode;

  /**
   * Optional badge/count to display after the text.
   */
  badge?: React.ReactNode;

  /**
   * Custom active color (overrides default frost-ice).
   * Useful for color-coded tabs like "Wanted" using aurora-orange.
   */
  activeColor?: 'frost' | 'orange' | 'red' | 'green';
}

const activeColorClasses = {
  frost: {
    bg: 'bg-frost-ice',
    text: 'text-frost-ice',
    indicator: 'after:bg-frost-ice',
  },
  orange: {
    bg: 'bg-aurora-orange',
    text: 'text-aurora-orange',
    indicator: 'after:bg-aurora-orange',
  },
  red: {
    bg: 'bg-aurora-red',
    text: 'text-aurora-red',
    indicator: 'after:bg-aurora-red',
  },
  green: {
    bg: 'bg-aurora-green',
    text: 'text-aurora-green',
    indicator: 'after:bg-aurora-green',
  },
};

/**
 * A single tab trigger button.
 */
export function TabsTrigger({
  value,
  icon,
  badge,
  activeColor = 'frost',
  children,
  className,
  ...props
}: TabsTriggerProps) {
  const { activeTab, setActiveTab, variant, size, baseId } = useTabsContext();
  const isActive = activeTab === value;
  const styles = triggerVariants[variant || 'default'];
  const colors = activeColorClasses[activeColor];

  // Build active classes based on variant and color
  const getActiveClass = () => {
    if (variant === 'default') {
      return clsx(colors.text, colors.indicator);
    }
    if (variant === 'toggle' || variant === 'pills' || variant === 'cards') {
      return clsx(colors.bg, 'text-snow-white shadow-sm');
    }
    return styles.active;
  };

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-controls={`${baseId}-content-${value}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      className={clsx(
        triggerBaseStyles,
        styles.base,
        triggerSizes[size || 'md'],
        isActive ? getActiveClass() : styles.inactive,
        className
      )}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
      {badge !== undefined && (
        <span className={clsx('ml-1.5', isActive ? 'opacity-80' : 'text-text-muted')}>
          ({badge})
        </span>
      )}
    </button>
  );
}

// ============================================================================
// TabsContent
// ============================================================================

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The value that identifies which tab this content belongs to.
   */
  value: string;

  /**
   * If true, the content stays in the DOM when inactive (just hidden).
   * Useful for preserving form state.
   * @default false
   */
  forceMount?: boolean;
}

/**
 * Content panel for a tab.
 */
export function TabsContent({
  value,
  forceMount = false,
  children,
  className,
  ...props
}: TabsContentProps) {
  const { activeTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      hidden={!isActive}
      tabIndex={0}
      className={clsx('focus-visible:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
