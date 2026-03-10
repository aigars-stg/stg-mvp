'use client';

import { clsx } from 'clsx';

const activeColorClasses = {
  frost: 'bg-frost-ice text-snow-white shadow-sm',
  orange: 'bg-aurora-orange text-snow-white shadow-sm',
  red: 'bg-aurora-red text-snow-white shadow-sm',
  green: 'bg-aurora-green text-snow-white shadow-sm',
};

const sizeClasses = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
};

export interface SegmentedNavItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedNavProps<T extends SegmentedNavItem = SegmentedNavItem> {
  items: T[];
  activeValue: string;
  /** Called when an item is clicked (button mode — no renderItem needed). */
  onValueChange?: (value: string) => void;
  /** Active pill color. Default: 'frost' */
  color?: 'frost' | 'orange' | 'red' | 'green';
  size?: 'sm' | 'md';
  /**
   * Override item rendering — use this to pass Link components for routing.
   * Receives the full item (including any extra properties beyond SegmentedNavItem),
   * whether it's active, and the computed className to apply.
   */
  renderItem?: (item: T, isActive: boolean, className: string) => React.ReactNode;
  className?: string;
}

/**
 * SegmentedNav — a pill-style toggle bar for switching between views or routes.
 *
 * Matches the visual design of `<Tabs variant="toggle">`.
 *
 * @example
 * // Button mode (value switching)
 * <SegmentedNav
 *   items={[{ value: 'profile', label: 'Profile' }, { value: 'prefs', label: 'Preferences' }]}
 *   activeValue={active}
 *   onValueChange={setActive}
 * />
 *
 * @example
 * // Link mode (URL routing — pass renderItem to use Link components)
 * <SegmentedNav
 *   items={NAV_ITEMS}
 *   activeValue={activeSection}
 *   renderItem={(item, isActive, className) => (
 *     <Link href={item.href} className={className}>{item.label}</Link>
 *   )}
 * />
 *
 * @example
 * // Orange variant
 * <SegmentedNav items={items} activeValue={active} color="orange" onValueChange={setActive} />
 */
export function SegmentedNav<T extends SegmentedNavItem>({
  items,
  activeValue,
  onValueChange,
  color = 'frost',
  size = 'sm',
  renderItem,
  className,
}: SegmentedNavProps<T>) {
  const itemBase = clsx(
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost-ice focus-visible:ring-offset-1',
    sizeClasses[size]
  );

  const getItemClass = (isActive: boolean) =>
    clsx(itemBase, isActive ? activeColorClasses[color] : 'text-text-secondary hover:text-text');

  return (
    <div
      className={clsx(
        'inline-flex overflow-x-auto rounded-lg border border-border p-0.5 bg-snow-white/80 shadow-sm',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.value === activeValue;
        const itemClass = getItemClass(isActive);

        if (renderItem) {
          return renderItem(item, isActive, itemClass);
        }

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onValueChange?.(item.value)}
            className={itemClass}
          >
            {item.icon && <span className="shrink-0" aria-hidden="true">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
