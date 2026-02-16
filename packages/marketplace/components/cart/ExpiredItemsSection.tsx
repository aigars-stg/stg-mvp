'use client';

import { useState, useEffect, useRef } from 'react';
import { Time as Clock, X } from '@/lib/icons';
import { useCart } from '@/lib/contexts/CartContext';
import { ExpiredItemCard } from './ExpiredItemCard';
import { useTranslations } from 'next-intl';

interface ExpiredItemsSectionProps {
  onReAdd?: () => void;
}

export function ExpiredItemsSection({ onReAdd }: ExpiredItemsSectionProps) {
  const t = useTranslations('Cart');
  const { expiredItems, dismissExpiredItem, clearExpiredItems } = useCart();
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());
  const checkedRef = useRef<Set<string>>(new Set());

  // Check availability of expired items in background, hide unavailable ones
  useEffect(() => {
    if (expiredItems.length === 0) return;

    // Only check items we haven't checked yet
    const uncheckedItems = expiredItems.filter(
      item => !checkedRef.current.has(item.listing_id)
    );
    if (uncheckedItems.length === 0) return;

    const listingIds = uncheckedItems.map(item => item.listing_id);
    let cancelled = false;

    const checkAvailability = async () => {
      try {
        const response = await fetch('/api/listings/batch-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingIds }),
        });

        if (cancelled) return;

        if (!response.ok) {
          // On error, assume all are available (re-add will handle failures)
          listingIds.forEach(id => checkedRef.current.add(id));
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        const availableSet = new Set(data.available || []);
        const newUnavailable = listingIds.filter(id => !availableSet.has(id));

        listingIds.forEach(id => checkedRef.current.add(id));

        if (newUnavailable.length > 0) {
          setUnavailableIds(prev => {
            const next = new Set(prev);
            newUnavailable.forEach(id => next.add(id));
            return next;
          });
        }
      } catch {
        // On network error, assume all are available
        if (!cancelled) {
          listingIds.forEach(id => checkedRef.current.add(id));
        }
      }
    };

    checkAvailability();

    return () => { cancelled = true; };
  }, [expiredItems]);

  // Show all items immediately, filter out confirmed-unavailable ones
  const visibleItems = expiredItems.filter(
    item => !unavailableIds.has(item.listing_id)
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="bg-bg-secondary/30 border border-dashed border-border rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-polar-night">
            {t('expiredItems.title')}
          </h3>
        </div>
        <button
          onClick={clearExpiredItems}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-polar-night transition-colors"
        >
          <X className="w-3 h-3" />
          {t('expiredItems.dismissAll')}
        </button>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        {t('expiredItems.description')}
      </p>

      {/* Grid of expired items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleItems.map(item => (
          <ExpiredItemCard
            key={item.listing_id}
            item={item}
            onDismiss={dismissExpiredItem}
            onReAdd={onReAdd}
          />
        ))}
      </div>
    </div>
  );
}
