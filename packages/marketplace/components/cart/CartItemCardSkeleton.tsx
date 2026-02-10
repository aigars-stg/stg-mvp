'use client';

/**
 * Loading skeleton for CartItemCard
 * Matches the compact horizontal layout for smooth loading transitions
 */
export function CartItemCardSkeleton() {
  return (
    <div className="bg-snow-white animate-pulse">
      {/* Mobile Layout */}
      <div className="sm:hidden p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-20 h-20 bg-bg-secondary rounded-lg flex-shrink-0" />

          {/* Content */}
          <div className="flex-grow min-w-0 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="h-5 bg-bg-secondary rounded w-3/4" />
              <div className="h-5 bg-bg-secondary rounded w-14 flex-shrink-0" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 bg-bg-secondary rounded w-16" />
              <div className="h-5 bg-bg-secondary rounded w-20" />
            </div>
            <div className="h-4 bg-bg-secondary rounded w-40" />
            <div className="h-4 bg-bg-secondary rounded w-28" />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid sm:grid-cols-[100px_1fr_auto] gap-4 p-5">
        {/* Thumbnail */}
        <div className="w-[100px] h-[100px] bg-bg-secondary rounded-lg" />

        {/* Content */}
        <div className="space-y-2 flex flex-col justify-center">
          <div className="h-5 bg-bg-secondary rounded w-2/3" />
          <div className="flex gap-2">
            <div className="h-5 bg-bg-secondary rounded w-16" />
            <div className="h-5 bg-bg-secondary rounded w-20" />
          </div>
          <div className="h-4 bg-bg-secondary rounded w-44" />
          <div className="h-4 bg-bg-secondary rounded w-32" />
        </div>

        {/* Price & Action */}
        <div className="flex flex-col items-end justify-between">
          <div className="h-7 bg-bg-secondary rounded w-20" />
          <div className="h-9 w-9 bg-bg-secondary rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for an entire cart basket
 */
export function CartBasketSkeleton() {
  return (
    <div className="bg-snow-white border-2 border-border rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-b border-border-subtle">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 bg-bg-secondary rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 bg-bg-secondary rounded w-32" />
              <div className="h-4 bg-bg-secondary rounded w-20" />
            </div>
          </div>
          {/* Timer */}
          <div className="h-7 bg-bg-secondary rounded w-24" />
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border-subtle">
        <CartItemCardSkeleton />
        <CartItemCardSkeleton />
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Summary */}
          <div className="space-y-2 max-w-xs">
            <div className="flex justify-between">
              <div className="h-4 bg-bg-secondary rounded w-24" />
              <div className="h-4 bg-bg-secondary rounded w-16" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-bg-secondary rounded w-16" />
              <div className="h-4 bg-bg-secondary rounded w-12" />
            </div>
            <div className="border-t border-border-subtle pt-2">
              <div className="flex justify-between">
                <div className="h-5 bg-bg-secondary rounded w-12" />
                <div className="h-6 bg-bg-secondary rounded w-20" />
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="h-12 bg-bg-secondary rounded-lg w-full sm:w-32" />
        </div>
      </div>
    </div>
  );
}
