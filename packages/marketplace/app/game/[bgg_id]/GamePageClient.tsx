'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  Package,
  Users,
  Baby,
  Clock,
  ExternalLink,
  ArrowLeft,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { GameWithOffers } from '@/lib/types/aggregated-game';
import type { ListingCondition } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import { OfferCard } from '@/components/game/OfferCard';
import { useAuth } from '@/lib/auth/AuthContext';

type SortOption = 'price_asc' | 'price_desc' | 'condition' | 'newest';

interface GamePageClientProps {
  bggId: string;
}

export function GamePageClient({ bggId }: GamePageClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [game, setGame] = useState<GameWithOffers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [filterConditions, setFilterConditions] = useState<ListingCondition[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Cart states
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();
        queryParams.set('sort', sortBy);
        filterConditions.forEach((c) => queryParams.append('condition', c));

        const response = await fetch(`/api/games/${bggId}/offers?${queryParams.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch game');
        }

        setGame(data.game);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    if (bggId) {
      fetchGame();
    }
  }, [bggId, sortBy, filterConditions]);

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
    setSortBy('price_asc');
  };

  // Get available conditions from offers
  const availableConditions = game
    ? [...new Set(game.offers.map((o) => o.condition))]
    : [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading game...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || 'Game not found'}
          </h2>
          <p className="text-text-secondary mb-4">
            This game might not have any active listings.
          </p>
          <Link href="/browse">
            <Button variant="primary">Browse Games</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
            <Link href="/browse" className="hover:text-frost-ice flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Browse
            </Link>
            <span>/</span>
            <span className="text-polar-night font-medium line-clamp-1">
              {game.game_name}
            </span>
          </div>

          {/* Game Header - Horizontal Card */}
          <div className="bg-snow-white rounded-xl border-2 border-border overflow-hidden">
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
                    <Badge variant="warning" size="sm">Expansion</Badge>
                  </div>
                )}
              </div>

              {/* Game Info */}
              <div className="flex-grow p-4 sm:p-6 flex flex-col">
                {/* Game Name */}
                <h1 className="text-xl sm:text-2xl font-bold text-polar-night mb-4 line-clamp-2">
                  {game.game_name}
                </h1>

                {/* Metadata Row - compact format like listing card */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary mb-4">
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
                  {/* BGG Link - inline with metadata */}
                  <a
                    href={`https://boardgamegeek.com/boardgame/${game.bgg_game_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-frost-ice hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on BGG
                  </a>
                </div>

                {/* Powered by BGG - at bottom */}
                <div className="mt-auto pt-3 border-t border-border-subtle">
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
            <span className="text-aurora-green font-medium">Added to cart!</span>
            <Link href="/cart">
              <Button variant="primary" size="sm">View Cart</Button>
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
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-polar-night">
            Available Offers ({game.offers.length})
          </h2>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-lg border border-border bg-snow-white text-sm focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="condition">Condition: Best First</option>
              <option value="newest">Newest First</option>
            </select>

            {/* Filter Toggle */}
            <Button
              variant={filterConditions.length > 0 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Filters
              {filterConditions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-snow-white/20 rounded text-xs">
                  {filterConditions.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-snow-white border-2 border-border rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-polar-night">Filter by Condition</h3>
              {filterConditions.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-frost-ice hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
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
                    {getConditionLabel(condition)}
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
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-snow-white border-2 border-border rounded-xl">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-polar-night mb-2">
              No offers match your filters
            </h3>
            <p className="text-text-secondary mb-4">
              Try adjusting your filters to see more results.
            </p>
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
