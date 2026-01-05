'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import type { ListingWithSeller } from '@/lib/types/listing';

interface GameCollectionProps {
  /** Collection type to fetch */
  type: 'recently_listed' | 'popular' | 'price_drops' | 'trusted_sellers' | 'great_condition';
  /** Number of items to show */
  limit?: number;
  /** Override title */
  title?: string;
  /** Override subtitle */
  subtitle?: string;
  /** Show "View All" link */
  showViewAll?: boolean;
  /** View all link href */
  viewAllHref?: string;
}

interface CollectionData {
  type: string;
  title: string;
  subtitle: string;
  listings: ListingWithSeller[];
  count: number;
}

/**
 * Displays a horizontal scrollable collection of game listings
 */
export function GameCollection({
  type,
  limit = 8,
  title: overrideTitle,
  subtitle: overrideSubtitle,
  showViewAll = true,
  viewAllHref = '/browse',
}: GameCollectionProps) {
  const t = useTranslations('HomePage.collections');
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    async function fetchCollection() {
      try {
        setLoading(true);
        const res = await fetch(`/api/collections?type=${type}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch collection');
        const data = await res.json();
        setCollection(data.collection);
      } catch (err) {
        console.error('Error fetching collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchCollection();
  }, [type, limit]);

  // Check scroll state
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [collection]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 260; // Card width + gap
    const scrollAmount = cardWidth * 2;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Don't render if no listings
  if (!loading && (!collection || collection.count === 0)) {
    return null;
  }

  const displayTitle = overrideTitle || collection?.title || 'Games';
  const displaySubtitle = overrideSubtitle || collection?.subtitle || '';

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-polar-night">
              {loading ? (
                <span className="inline-block w-48 h-8 bg-bg-elevated rounded animate-pulse" />
              ) : (
                displayTitle
              )}
            </h2>
            {(loading || displaySubtitle) && (
              <p className="text-text-secondary mt-1">
                {loading ? (
                  <span className="inline-block w-64 h-5 bg-bg-elevated rounded animate-pulse" />
                ) : (
                  displaySubtitle
                )}
              </p>
            )}
          </div>

          {showViewAll && !loading && (
            <Link
              href={viewAllHref}
              className="hidden sm:flex items-center gap-1 text-frost-ice hover:text-frost-polar transition-colors font-medium"
            >
              {t('viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Scrollable Container */}
        <div className="relative group">
          {/* Scroll Buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-snow-white border border-border rounded-full shadow-lg flex items-center justify-center text-polar-night hover:bg-bg-secondary transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
              aria-label={t('scrollLeft')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-snow-white border border-border rounded-full shadow-lg flex items-center justify-center text-polar-night hover:bg-bg-secondary transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
              aria-label={t('scrollRight')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Cards Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[260px] snap-start">
                  <ListingCardSkeleton />
                </div>
              ))
            ) : (
              // Actual listings
              collection?.listings.map((listing) => (
                <div key={listing.id} className="flex-shrink-0 w-[260px] snap-start">
                  <ListingCard listing={listing} showSeller />
                </div>
              ))
            )}
          </div>

          {/* Price disclaimer */}
          {!loading && (
            <p className="text-xs text-text-secondary mt-3">
              {t('priceDisclaimer')}
            </p>
          )}
        </div>

        {/* Mobile View All */}
        {showViewAll && !loading && (
          <div className="mt-6 text-center sm:hidden">
            <Link href={viewAllHref}>
              <Button variant="secondary">
                {t('viewAll')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Static loading placeholder for SSR
 */
export function GameCollectionSkeleton() {
  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="w-48 h-8 bg-bg-elevated rounded animate-pulse" />
          <div className="w-64 h-5 bg-bg-elevated rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[260px]">
              <ListingCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
