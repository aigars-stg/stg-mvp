/* eslint-disable @next/next/no-img-element -- game images are external BGG URLs */
'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button, Badge, ResultPage } from '@second-turn/design-system';
import {
  Package, Users, User as Baby, Time as Clock,
  LinkExternal as ExternalLink, ArrowLeft,
  RefreshCw as Loader2, AlertCircle,
  Settings as Cog, PuzzlePiece as Puzzle,
  ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown,
} from '@/lib/icons';
import type { GameWithOffers } from '@/lib/types/aggregated-game';
import type { ListingType } from '@/lib/types/listing';
import { isAuctionListing } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { OfferCard } from '@/components/game/OfferCard';
import { WantedOfferCard } from '@/components/game/WantedOfferCard';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { useGameNavigation } from '@/hooks/useGameNavigation';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

type SortOption = 'price_asc' | 'price_desc' | 'newest';

interface GamePageClientProps {
  bggId: string;
}

export function GamePageClient({ bggId }: GamePageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { fetchCart } = useCart();
  const t = useTranslations('GameDetail');
  const tNav = useTranslations('Navigation');
  const tListings = useTranslations('Listings');
  const tArrows = useTranslations('Game.NavigationArrows');

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
  const [listingTypeFilter, setListingTypeFilter] = useState<ListingType | 'all'>('all');

  // Cart states
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Scroll to #wanted hash on page load
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#wanted') {
        setTimeout(() => {
          const element = document.getElementById('wanted');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [loading]);

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();
        queryParams.set('sort', sortBy);

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
  }, [bggId, sortBy]);

  // Add to cart handler
  const handleAddToCart = async (listingId: string) => {
    if (!user) {
      router.push(`/auth/signin?redirectTo=/game/${bggId}`);
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

      // Update the listing's reserved_until in local state
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

  // Clear all filters
  const clearFilters = () => {
    setListingTypeFilter('all');
    setSortBy('price_asc');
  };

  // Split offers: auctions filtered by end state, regular offers filtered by listing type
  const now = new Date();
  const auctionOffers = game?.offers.filter(o => {
    if (!isAuctionListing(o)) return false;
    // Hide expired auctions with no bids (they're dead listings)
    if (o.auction_ends_at && new Date(o.auction_ends_at) < now) {
      // Keep auctions with bids visible (awaiting payment / second-chance flow)
      return (o.auction_bid_count ?? 0) > 0;
    }
    return true;
  }) ?? [];
  const regularOffers = game?.offers.filter(o => !isAuctionListing(o)) ?? [];
  const filteredOffers = listingTypeFilter === 'all'
    ? regularOffers
    : regularOffers.filter(o => o.listing_type === listingTypeFilter);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !game) {
    return (
      <ResultPage
        variant="error"
        icon={<AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />}
        title={error || t('errors.gameNotFound')}
        description={t('errors.noActiveListings')}
      >
        <ResultPage.Actions>
          <Link href="/browse" className="block">
            <Button variant="primary" fullWidth>{t('errors.browseGames')}</Button>
          </Link>
        </ResultPage.Actions>
      </ResultPage>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/browse" className="hover:text-frost-ice flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            {tNav('browse')}
          </Link>
          <span>/</span>
          <span className="text-polar-night font-medium line-clamp-1">
            {game.game_name}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {/* ====== MOBILE: Compact Game Card ====== */}
        <div className="lg:hidden mb-4">
          <div
            className="bg-snow-white rounded-xl border border-border p-4 touch-pan-y"
            style={swipeStyle}
            {...swipeBind()}
          >
            <div className="flex gap-3">
              {/* Game Image */}
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg bg-polar-night/5 overflow-hidden flex items-center justify-center">
                {game.image || game.thumbnail ? (
                  <img
                    src={game.image || game.thumbnail || ''}
                    alt={game.game_name}
                    className="max-w-full max-h-full object-contain p-1"
                  />
                ) : (
                  <Package className="w-8 h-8 text-text-muted" />
                )}
                {game.is_expansion && (
                  <div className="absolute top-0 left-0">
                    <Badge variant="default" size="sm">
                      <Puzzle className="w-2.5 h-2.5" />
                    </Badge>
                  </div>
                )}
              </div>

              {/* Game Info */}
              <div className="min-w-0 flex-grow">
                <h1 className="flex items-baseline gap-1 text-base font-bold text-polar-night line-clamp-1">
                  {game.game_name}
                  {game.game_year && (
                    <span className="font-normal text-text-secondary text-sm">
                      ({game.game_year})
                    </span>
                  )}
                  <a
                    href={`https://boardgamegeek.com/boardgame/${game.bgg_game_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 text-text-muted hover:text-frost-ice transition-colors"
                    title={t('bgg.viewOnBGG')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </h1>

                {/* Compact metadata */}
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary mt-0.5">
                  {game.player_count && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {game.player_count}
                    </span>
                  )}
                  {game.min_age && (
                    <span className="flex items-center gap-1">
                      <Baby className="w-3 h-3" />
                      {game.min_age}+
                    </span>
                  )}
                  {game.playing_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {game.playing_time}
                    </span>
                  )}
                </div>

                {/* Powered by BGG */}
                <a
                  href="https://boardgamegeek.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1.5"
                >
                  <img
                    src="/images/powered-by-bgg-rgb.svg"
                    alt="Powered by BoardGameGeek"
                    className="h-4 opacity-40 hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* ====== MOBILE: Filter Bar ====== */}
        <div className="lg:hidden mb-4 space-y-2">
          {game.offers.length > 0 && (
            <Link href={`/sell?q=${encodeURIComponent(game.game_name)}`} className="block">
              <Button variant="primary" className="w-full py-3">
                {t('actions.sellThisGame')}
              </Button>
            </Link>
          )}

          {regularOffers.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Listing type pills */}
              {(['all', 'instant_buy', 'contact_seller'] as const).map((type) => (
                <Badge
                  key={type}
                  variant={listingTypeFilter === type ? 'trust' : 'default'}
                  size="sm"
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => setListingTypeFilter(type)}
                >
                  {t(`filter.${type === 'all' ? 'all' : type === 'instant_buy' ? 'buy' : 'contact'}`)}
                </Badge>
              ))}
              {/* Thin separator */}
              <div className="w-px h-5 bg-border-subtle" />
              {/* Sort pills */}
              <Badge
                variant={sortBy !== 'newest' ? 'trust' : 'default'}
                size="sm"
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc')}
              >
                {t(sortBy === 'price_desc' ? 'sort.priceDesc' : 'sort.priceAsc')}
                {sortBy === 'price_desc'
                  ? <ArrowDown className="w-3 h-3 ml-0.5" />
                  : <ArrowUp className="w-3 h-3 ml-0.5" />
                }
              </Badge>
              <Badge
                variant={sortBy === 'newest' ? 'trust' : 'default'}
                size="sm"
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => setSortBy('newest')}
              >
                {t('sort.newest')}
              </Badge>
            </div>
          )}
        </div>

        {/* ====== TWO-COLUMN GRID ====== */}
        <div className="lg:grid lg:grid-cols-7 lg:gap-8">

          {/* ====== DESKTOP SIDEBAR (left, narrow) ====== */}
          <aside className="hidden lg:block lg:col-span-2">
            <div className="sticky top-6">
              <div className="bg-snow-white border border-border rounded-xl p-4">
                {/* Game Image */}
                <div className="relative -mx-4 -mt-4 mb-3 rounded-t-xl bg-polar-night/5 overflow-hidden flex items-center justify-center h-48">
                  {game.image || game.thumbnail ? (
                    <img
                      src={game.image || game.thumbnail || ''}
                      alt={game.game_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-text-muted" />
                  )}
                  {game.is_expansion && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                        {tListings('card.expansion')}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Game Info */}
                <h1 className="flex items-baseline gap-1.5 flex-wrap text-lg font-bold text-polar-night leading-snug">
                  {game.game_name}
                  {game.game_year && (
                    <span className="font-normal text-text-secondary text-sm">
                      ({game.game_year})
                    </span>
                  )}
                  <a
                    href={`https://boardgamegeek.com/boardgame/${game.bgg_game_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 text-text-muted hover:text-frost-ice transition-colors"
                    title={t('bgg.viewOnBGG')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </h1>

                {game.designers && game.designers.length > 0 && (
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <Cog className="w-3 h-3 flex-shrink-0" />
                    {game.designers.join(', ')}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary mt-1.5">
                  {game.player_count && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {game.player_count}
                    </span>
                  )}
                  {game.min_age && (
                    <span className="flex items-center gap-1">
                      <Baby className="w-3.5 h-3.5" />
                      {game.min_age}+
                    </span>
                  )}
                  {game.playing_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {game.playing_time}
                    </span>
                  )}
                </div>

                {/* Powered by BGG */}
                <a
                  href="https://boardgamegeek.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1.5"
                >
                  <img
                    src="/images/powered-by-bgg-rgb.svg"
                    alt="Powered by BoardGameGeek"
                    className="h-5 opacity-40 hover:opacity-100 transition-opacity"
                  />
                </a>

                {/* Game Navigation (browse context) */}
                {hasContext && (
                  <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border-subtle text-sm">
                    <button
                      onClick={navigatePrev}
                      disabled={!hasPrev}
                      className="flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-frost-ice/5 text-text-secondary hover:text-polar-night disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={tArrows('previousGame')}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      {tArrows('previous')}
                    </button>
                    <span className="text-text-muted">·</span>
                    <button
                      onClick={navigateNext}
                      disabled={!hasNext}
                      className="flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-frost-ice/5 text-text-secondary hover:text-polar-night disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={tArrows('nextGame')}
                    >
                      {tArrows('next')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Sell This Game CTA (hidden when no offers — empty state has its own) */}
                {game.offers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-xs text-text-secondary mb-1.5">{t('actions.gotThisGame')}</p>
                    <Link href={`/sell?q=${encodeURIComponent(game.game_name)}`} className="block">
                      <Button variant="primary" className="w-full" size="sm">
                        {t('actions.sellThisGame')}
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Filter Pills (only when multiple non-auction offers) */}
                {regularOffers.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                    {/* Listing type pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(['all', 'instant_buy', 'contact_seller'] as const).map((type) => (
                        <Badge
                          key={type}
                          variant={listingTypeFilter === type ? 'trust' : 'default'}
                          size="sm"
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => setListingTypeFilter(type)}
                        >
                          {t(`filter.${type === 'all' ? 'all' : type === 'instant_buy' ? 'buy' : 'contact'}`)}
                        </Badge>
                      ))}
                    </div>
                    {/* Sort pills */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant={sortBy !== 'newest' ? 'trust' : 'default'}
                        size="sm"
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc')}
                      >
                        {t(sortBy === 'price_desc' ? 'sort.priceDesc' : 'sort.priceAsc')}
                        {sortBy === 'price_desc'
                          ? <ArrowDown className="w-3 h-3 ml-0.5" />
                          : <ArrowUp className="w-3 h-3 ml-0.5" />
                        }
                      </Badge>
                      <Badge
                        variant={sortBy === 'newest' ? 'trust' : 'default'}
                        size="sm"
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => setSortBy('newest')}
                      >
                        {t('sort.newest')}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ====== OFFERS COLUMN (right, wider) ====== */}
          <div className="lg:col-span-5">
            {/* Cart Notifications */}
            {cartSuccess && (
              <div className="mb-4 p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-center justify-between">
                <span className="text-aurora-green font-medium">{t('cart.addedToCart')}</span>
                <Link href="/cart">
                  <Button variant="primary" size="sm">{t('cart.viewCart')}</Button>
                </Link>
              </div>
            )}

            {cartError && (
              <div className="mb-4 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0" />
                <span className="text-aurora-red">{cartError}</span>
              </div>
            )}

            {/* Active Auctions Section */}
            {auctionOffers.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-polar-night mb-4">
                  {t('offers.activeAuctions', { count: auctionOffers.length })}
                </h2>
                <div className="space-y-4 mb-6">
                  {auctionOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      listing={offer}
                      onAddToCart={handleAddToCart}
                      isAddingToCart={addingToCart === offer.id}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Offers Heading */}
            <h2 className="text-lg font-semibold text-polar-night mb-4">
              {t('offers.availableOffers', { count: filteredOffers.length })}
            </h2>

            {/* Offers List */}
            {filteredOffers.length > 0 ? (
              <div className="space-y-4">
                {filteredOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    listing={offer}
                    onAddToCart={handleAddToCart}
                    isAddingToCart={addingToCart === offer.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-snow-white border border-border rounded-xl">
                <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                {listingTypeFilter !== 'all' ? (
                  <>
                    <h3 className="text-lg font-semibold text-polar-night mb-2">
                      {t('emptyState.noOffersMatch')}
                    </h3>
                    <p className="text-text-secondary mb-4">
                      {t('emptyState.tryAdjusting')}
                    </p>
                    <Button variant="secondary" onClick={clearFilters}>
                      {t('filter.clearFilters')}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-polar-night mb-2">
                      {t('emptyState.noOffersYet')}
                    </h3>
                    <p className="text-text-secondary mb-4">
                      {t('emptyState.beFirstToSell')}
                    </p>
                    <Link href={`/sell?q=${encodeURIComponent(game.game_name)}`}>
                      <Button variant="primary">
                        {t('actions.sellThisGame')}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Private Seller Footnote */}
            {(filteredOffers.length > 0 || auctionOffers.length > 0) && (
              <p className="mt-4 text-xs text-text-muted">
                * {t('privateSeller.footnote')}{' '}
                <Link href="/help/buying" className="underline underline-offset-2">
                  {t('privateSeller.learnMore')}
                </Link>
              </p>
            )}

            {/* People Looking For This (Wanted Listings) */}
            {wantedListings.length > 0 && (
              <section id="wanted" className="mt-12 scroll-mt-8">
                <h2 className="text-xl font-semibold text-polar-night mb-6">
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
      </div>
    </div>
  );
}
