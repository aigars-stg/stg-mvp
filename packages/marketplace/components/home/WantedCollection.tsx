'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import { ChevronLeft, ChevronRight, ArrowRight, Plus, Search } from 'griddy-icons';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';

interface WantedCollectionProps {
  /** Number of items to show */
  limit?: number;
  /** Override title */
  title?: string;
  /** Override subtitle */
  subtitle?: string;
  /** Show "View All" link */
  showViewAll?: boolean;
}

/**
 * Displays a horizontal scrollable collection of wanted listings
 */
export function WantedCollection({
  limit = 8,
  title,
  subtitle,
  showViewAll = true,
}: WantedCollectionProps) {
  const t = useTranslations('HomePage.wantedCollection');
  const [listings, setListings] = useState<WantedListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Use translations as defaults if not provided
  const displayTitle = title ?? t('title');
  const displaySubtitle = subtitle ?? t('subtitle');

  useEffect(() => {
    async function fetchWantedListings() {
      try {
        setLoading(true);
        const res = await fetch(`/api/wanted?status=active&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch wanted listings');
        const data = await res.json();
        setListings(data.wantedListings || []);
      } catch (err) {
        console.error('Error fetching wanted listings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchWantedListings();
  }, [limit]);

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
  }, [listings]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 300; // Approximate card width + gap
    const scrollAmount = cardWidth * 2;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Show empty state with CTA if no listings
  if (!loading && listings.length === 0) {
    return (
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-polar-night">
                {displayTitle}
              </h2>
              <p className="text-text-secondary mt-1">{displaySubtitle}</p>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-aurora-orange/5 border-2 border-dashed border-aurora-orange/30 rounded-2xl p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-aurora-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-aurora-orange" />
            </div>
            <h3 className="text-xl font-bold text-polar-night mb-2">
              {t('empty.title')}
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {t('empty.description')}
            </p>
            <Link href="/wanted/new">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                {t('empty.button')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

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

          <div className="hidden sm:flex items-center gap-3">
            {showViewAll && !loading && (
              <Link
                href="/browse?type=wanted"
                className="flex items-center gap-1 text-frost-ice hover:text-frost-polar transition-colors font-medium"
              >
                {t('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link href="/wanted/new">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {t('postWanted')}
              </Button>
            </Link>
          </div>
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
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[300px] snap-start">
                  <WantedCardSkeleton />
                </div>
              ))
            ) : (
              // Actual listings
              listings.map((listing) => (
                <div key={listing.id} className="flex-shrink-0 w-[300px] snap-start">
                  <WantedListingCard wantedListing={listing} showBuyer />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile Actions */}
        {!loading && (
          <div className="mt-6 flex flex-col sm:hidden gap-3">
            <Link href="/wanted/new" className="w-full">
              <Button variant="primary" fullWidth>
                <Plus className="w-4 h-4 mr-2" />
                {t('postWantedListing')}
              </Button>
            </Link>
            {showViewAll && (
              <Link href="/browse?type=wanted" className="w-full">
                <Button variant="secondary" fullWidth>
                  {t('viewAllWanted')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Loading skeleton for wanted card
 */
function WantedCardSkeleton() {
  return (
    <div className="bg-snow-white border border-border rounded-xl overflow-hidden h-full animate-pulse">
      {/* Image placeholder */}
      <div className="h-64 bg-bg-elevated" />
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="h-6 bg-bg-elevated rounded w-3/4" />
        <div className="h-4 bg-bg-elevated rounded w-1/2" />
        <div className="h-8 bg-bg-elevated rounded w-1/3" />
        <div className="flex gap-2">
          <div className="h-6 bg-bg-elevated rounded w-16" />
          <div className="h-6 bg-bg-elevated rounded w-16" />
        </div>
        <div className="h-4 bg-bg-elevated rounded w-full" />
      </div>
    </div>
  );
}

/**
 * Static loading placeholder for SSR
 */
export function WantedCollectionSkeleton() {
  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="w-48 h-8 bg-bg-elevated rounded animate-pulse" />
          <div className="w-64 h-5 bg-bg-elevated rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[300px]">
              <WantedCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
