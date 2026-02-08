/* eslint-disable @next/next/no-img-element -- game images are external BGG URLs */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import { Package, Users, User as Baby, Time as Clock, LinkExternal as ExternalLink, ArrowLeft, RefreshCw as Loader2, AlertCircle, SettingsAdjustHorizontal as SlidersHorizontal, Close, ChevronDown, ChevronUp, Settings as Cog, PuzzlePiece as Puzzle, Plus } from 'griddy-icons';
import type { GameWithOffers } from '@/lib/types/aggregated-game';
import type { ListingCondition, ListingType } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { OfferCard } from '@/components/game/OfferCard';
import { WantedOfferCard } from '@/components/game/WantedOfferCard';
import { GameNavigationArrows } from '@/components/game/GameNavigationArrows';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { useGameNavigation } from '@/hooks/useGameNavigation';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

type SortOption = 'price_asc' | 'price_desc' | 'condition' | 'newest';

interface GamePageClientProps {
  bggId: string;
}

export function GamePageClient({ bggId }: GamePageClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { fetchCart } = useCart();
  const t = useTranslations('GameDetail');
  const tNav = useTranslations('Navigation');
  const tListings = useTranslations('Listings');

  // Buyer's country for pricing estimates (from profile)
  const buyerCountry = profile?.country as 'LT' | 'LV' | 'EE' | undefined;

  const [game, setGame] = useState<GameWithOffers | null>(null);
  const [wantedListings, setWantedListings] = useState<WantedListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game navigation
  const {
    hasPrev,
    hasNext,
    navigatePrev,
    navigateNext,
    hasContext,
  } = useGameNavigation(parseInt(bggId));

  // Mobile swipe navigation
  const { bind: swipeBind, style: swipeStyle } = useSwipeNavigation({
    onSwipeLeft: navigateNext,
    onSwipeRight: navigatePrev,
    enabled: hasContext,
  });

  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [filterConditions, setFilterConditions] = useState<ListingCondition[]>([]);
  const [listingTypeFilter, setListingTypeFilter] = useState<ListingType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Cart states
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Description expansion
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Scroll to #wanted hash on page load
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#wanted') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const element = document.getElementById('wanted');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [loading]);

  // Decode HTML entities in description (BGG returns HTML-encoded text)
  const decodeHTMLEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();
        queryParams.set('sort', sortBy);
        filterConditions.forEach((c) => queryParams.append('condition', c));
        if (listingTypeFilter !== 'all') {
          queryParams.set('listingType', listingTypeFilter);
        }

        const response = await fetch(`/api/games/${bggId}/offers?${queryParams.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch game');
        }

        setGame(data.game);
        setWantedListings(data.wantedListings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    if (bggId) {
      fetchGame();
    }
  }, [bggId, sortBy, filterConditions, listingTypeFilter]);

  // Add to cart handler
  const handleAddToCart = async (listingId: string) => {
    if (!user) {
      router.push(`/auth/signin?redirect=/game/${bggId}`);
      return;
    }

    try {
      setAddingToCart(listingId);
      setCartError(null);

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to cart');
      }

      // Update the listing's reserved_until in local state so UI shows "Reserved" immediately
      if (data.expiresAt && game) {
        setGame({
          ...game,
          offers: game.offers.map((offer) =>
            offer.id === listingId
              ? { ...offer, reserved_until: data.expiresAt, reserved_by: user.id }
              : offer
          ),
        });
      }

      // Refresh cart context so navbar cart count updates
      fetchCart();

      setCartSuccess(listingId);
      setTimeout(() => setCartSuccess(null), 3000);
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to add to cart');
      setTimeout(() => setCartError(null), 5000);
    } finally {
      setAddingToCart(null);
    }
  };

  // Toggle condition filter
  const toggleCondition = (condition: ListingCondition) => {
    setFilterConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterConditions([]);
    setListingTypeFilter('all');
    setSortBy('price_asc');
  };

  // Get available conditions from offers
  const availableConditions = game
    ? [...new Set(game.offers.map((o) => o.condition))]
    : [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary dark:bg-polar-night">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary dark:text-snow-stormLight">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary dark:bg-polar-night">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night dark:text-snow-stormLightest mb-2">
            {error || t('errors.gameNotFound')}
          </h2>
          <p className="text-text-secondary dark:text-snow-stormLight mb-4">
            {t('errors.noActiveListings')}
          </p>
          <Link href="/browse">
            <Button variant="primary">{t('errors.browseGames')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary dark:bg-polar-night">
      {/* Header */}
      <div className="bg-frost-ice/5 dark:bg-polar-nightLight/50 border-b border-frost-ice/20 dark:border-polar-nightDark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-snow-stormLight mb-4">
            <Link href="/browse" className="hover:text-frost-ice flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {tNav('browse')}
            </Link>
            <span>/</span>
            <span className="text-polar-night dark:text-snow-stormLightest font-medium line-clamp-1">
              {game.game_name}
            </span>
          </div>

          {/* Game Header - Horizontal Card with Navigation */}
          <div className="relative">
            {/* Navigation Arrows (desktop) */}
            {hasContext && (
              <GameNavigationArrows
                onPrev={navigatePrev}
                onNext={navigateNext}
                hasPrev={hasPrev}
                hasNext={hasNext}
              />
            )}

            {/* Game Card with swipe support */}
            <div
              className="bg-snow-white dark:bg-polar-nightLight rounded-xl border-2 border-border dark:border-polar-nightDark overflow-hidden touch-pan-y"
              style={swipeStyle}
              {...swipeBind()}
            >
              <div className="flex flex-col sm:flex-row">
              {/* Game Image - Fixed dimensions matching AggregatedGameCard */}
              <div className="relative h-48 sm:h-56 sm:w-56 lg:h-64 lg:w-64 flex-shrink-0 bg-polar-night/5 flex items-center justify-center overflow-hidden">
                {game.image || game.thumbnail ? (
                  <img
                    src={game.image || game.thumbnail || ''}
                    alt={game.game_name}
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <Package className="w-16 h-16 text-text-muted" />
                )}
                {/* Expansion Badge - overlaid on image */}
                {game.is_expansion && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                      {tListings('card.expansion')}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Game Info */}
              <div className="flex-grow p-4 sm:p-6 flex flex-col">
                {/* Game Name with Year */}
                <h1 className="text-xl sm:text-2xl font-bold text-polar-night dark:text-snow-stormLightest mb-1 line-clamp-2">
                  {game.game_name}
                  {game.game_year && (
                    <span className="font-normal text-text-secondary dark:text-snow-stormLight ml-2">
                      ({game.game_year})
                    </span>
                  )}
                </h1>

                {/* Designers */}
                {game.designers && game.designers.length > 0 && (
                  <p className="text-sm text-text-secondary dark:text-snow-stormLight mb-3 flex items-center gap-1.5">
                    <Cog className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {game.designers.length === 1
                        ? game.designers[0]
                        : game.designers.join(', ')}
                    </span>
                  </p>
                )}

                {/* Metadata Row - compact format like listing card */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary dark:text-snow-stormLight mb-4">
                  {game.player_count && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {game.player_count}
                    </span>
                  )}
                  {game.min_age && (
                    <span className="flex items-center gap-1">
                      <Baby className="w-4 h-4" />
                      {game.min_age}+
                    </span>
                  )}
                  {game.playing_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {game.playing_time}
                    </span>
                  )}
                </div>

                {/* Description */}
                {game.description && (
                  <div className="mb-4">
                    <p className={`text-sm text-text-secondary dark:text-snow-stormLight ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                      {decodeHTMLEntities(game.description)}
                    </p>
                    {game.description.length > 200 && (
                      <button
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="text-sm text-frost-ice hover:underline mt-1 flex items-center gap-1"
                      >
                        {descriptionExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            {t('description.showLess')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            {t('description.readMore')}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Powered by BGG - at bottom */}
                <div className="mt-auto pt-3 border-t border-border-subtle dark:border-polar-nightDark flex items-center justify-between">
                  <a
                    href="https://boardgamegeek.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img
                      src="/images/powered-by-bgg-rgb.svg"
                      alt="Powered by BoardGameGeek"
                      className="h-6 opacity-60 hover:opacity-100 transition-opacity"
                    />
                  </a>
                  <a
                    href={`https://boardgamegeek.com/boardgame/${game.bgg_game_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-frost-ice hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('bgg.viewOnBGG')}
                  </a>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Cart Notifications */}
        {cartSuccess && (
          <div className="mb-6 p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-center justify-between">
            <span className="text-aurora-green font-medium">{t('cart.addedToCart')}</span>
            <Link href="/cart">
              <Button variant="primary" size="sm">{t('cart.viewCart')}</Button>
            </Link>
          </div>
        )}

        {cartError && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0" />
            <span className="text-aurora-red">{cartError}</span>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-xl font-semibold text-polar-night dark:text-snow-stormLightest">
            {t('offers.availableOffers', { count: game.offers.length })}
          </h2>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Sell This Game Button - always visible */}
            <Link href={`/sell?q=${encodeURIComponent(game.game_name)}`}>
              <Button variant="primary" size="sm" className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-1.5" />
                {t('actions.sellThisGame')}
              </Button>
            </Link>

            {/* Filter controls - only when multiple offers */}
            {game.offers.length > 1 && (
              <>
                {/* Listing Type Dropdown */}
                <select
                value={listingTypeFilter}
                onChange={(e) => setListingTypeFilter(e.target.value as ListingType | 'all')}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-border dark:border-polar-nightDark bg-snow-white dark:bg-polar-nightLight text-sm text-polar-night dark:text-snow-stormLightest focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none"
              >
                <option value="all">{t('filter.allListings')}</option>
                <option value="instant_buy">{t('filter.instantBuy')}</option>
                <option value="contact_seller">{t('filter.contactSeller')}</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-border dark:border-polar-nightDark bg-snow-white dark:bg-polar-nightLight text-sm text-polar-night dark:text-snow-stormLightest focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none"
              >
                <option value="price_asc">{t('sort.priceLowHigh')}</option>
                <option value="price_desc">{t('sort.priceHighLow')}</option>
                <option value="condition">{t('sort.conditionBestFirst')}</option>
                <option value="newest">{t('sort.newestFirst')}</option>
              </select>

              {/* Filter Toggle */}
              <Button
                variant={filterConditions.length > 0 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                {t('filter.filters')}
                {filterConditions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-snow-white/20 rounded text-xs">
                    {filterConditions.length}
                  </span>
                )}
              </Button>
              </>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && game.offers.length > 1 && (
          <div className="mb-6 p-4 bg-snow-white dark:bg-polar-nightLight border-2 border-border dark:border-polar-nightDark rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-polar-night dark:text-snow-stormLightest">{t('filter.filterByCondition')}</h3>
              {filterConditions.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-frost-ice hover:underline flex items-center gap-1"
                >
                  <Close className="w-3 h-3" />
                  {t('filter.clearAll')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['likeNew', 'veryGood', 'good', 'acceptable'] as ListingCondition[]).map((condition) => {
                const isAvailable = availableConditions.includes(condition);
                const isSelected = filterConditions.includes(condition);
                return (
                  <button
                    key={condition}
                    onClick={() => isAvailable && toggleCondition(condition)}
                    disabled={!isAvailable}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${isSelected
                        ? 'bg-frost-ice text-snow-white'
                        : isAvailable
                          ? 'bg-bg-secondary text-text-secondary hover:bg-frost-ice/10 hover:text-frost-ice'
                          : 'bg-bg-secondary text-text-muted opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    {tListings(`conditions.${condition}`)}
                    {!isAvailable && ' (0)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Offers List */}
        {game.offers.length > 0 ? (
          <div className="space-y-4">
            {game.offers.map((offer) => (
              <OfferCard
                key={offer.id}
                listing={offer}
                onAddToCart={handleAddToCart}
                isAddingToCart={addingToCart === offer.id}
                buyerCountry={buyerCountry}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-snow-white dark:bg-polar-nightLight border-2 border-border dark:border-polar-nightDark rounded-xl">
            <Package className="w-12 h-12 text-text-muted dark:text-snow-stormMedium mx-auto mb-4" />
            {filterConditions.length > 0 || listingTypeFilter !== 'all' ? (
              <>
                <h3 className="text-lg font-semibold text-polar-night dark:text-snow-stormLightest mb-2">
                  {t('emptyState.noOffersMatch')}
                </h3>
                <p className="text-text-secondary dark:text-snow-stormLight mb-4">
                  {t('emptyState.tryAdjusting')}
                </p>
                <Button variant="secondary" onClick={clearFilters}>
                  {t('filter.clearFilters')}
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-polar-night dark:text-snow-stormLightest mb-2">
                  {t('emptyState.noOffersYet')}
                </h3>
                <p className="text-text-secondary dark:text-snow-stormLight mb-4">
                  {t('emptyState.beFirstToSell')}
                </p>
                <Link href={`/sell?q=${encodeURIComponent(game.game_name)}`}>
                  <Button variant="primary">
                    <Plus className="w-4 h-4 mr-1.5" />
                    {t('actions.sellThisGame')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}

        {/* People Looking For This (Wanted Listings) */}
        {wantedListings.length > 0 && (
          <section id="wanted" className="mt-12 scroll-mt-8">
            <h2 className="text-xl font-semibold text-polar-night dark:text-snow-stormLightest mb-6">
              {t('wanted.title', { count: wantedListings.length })}
            </h2>
            <div className="space-y-4">
              {wantedListings.map((wanted) => (
                <WantedOfferCard
                  key={wanted.id}
                  listing={wanted}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
