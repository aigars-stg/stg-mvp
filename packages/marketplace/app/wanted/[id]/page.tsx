'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, Badge, Card } from '@second-turn/design-system';
import {
  Package, MapPin, Users, Baby, Clock, TrendingUp, Calendar, AlertCircle, AlertTriangle, ChevronLeft, ExternalLink, Share2, Heart
} from 'lucide-react';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import {
  getBudgetDisplay,
  getTimeRemaining,
  getTimeRemainingDisplay,
  getWantedStatusLabel,
  getWantedStatusBadgeColor
} from '@/lib/types/wanted-listing';
import { getConditionLabel } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { OfferModal } from '@/components/wanted/OfferModal';
import Link from 'next/link';

export default function WantedListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const id = params.id as string;
  const openModalParam = searchParams.get('openModal');

  // Data state
  const [wantedListing, setWantedListing] = useState<WantedListingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [offerModalOpen, setOfferModalOpen] = useState(openModalParam === 'true');

  // Fetch wanted listing
  useEffect(() => {
    async function fetchWantedListing() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`/api/wanted/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch wanted listing');
        }

        setWantedListing(data.wantedListing);
      } catch (err: any) {
        console.error('Error fetching wanted listing:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchWantedListing();
    }
  }, [id]);

  const handleIHaveThisClick = () => {
    if (!user) {
      router.push(`/auth/signin?redirect=/wanted/${id}?openModal=true`);
      return;
    }

    setOfferModalOpen(true);
  };

  const handleOfferSubmit = async (offer: {
    offered_price: string;
    offered_condition: string;
    response_notes?: string;
    photo_urls?: string[];
  }) => {
    try {
      const response = await fetch(`/api/wanted/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit offer');
      }

      // Success! Redirect to the conversation
      router.push(`/messages/${data.conversation_id}`);
    } catch (err: any) {
      throw err; // Re-throw to be caught by OfferModal
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aurora-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading wanted listing...</p>
        </div>
      </div>
    );
  }

  if (error || !wantedListing) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-polar-night mb-2">
            {error || 'Wanted listing not found'}
          </h2>
          <p className="text-text-secondary mb-6">
            This wanted listing may have been removed or doesn't exist.
          </p>
          <Link href="/wanted">
            <Button variant="primary">Browse Wanted Listings</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { days, isExpiringSoon, isExpired } = getTimeRemaining(wantedListing.expires_at);
  const timeRemainingText = getTimeRemainingDisplay(wantedListing.expires_at);
  const budgetDisplay = getBudgetDisplay(
    wantedListing.min_price,
    wantedListing.max_price,
    wantedListing.currency
  );

  const isOwnListing = user?.id === wantedListing.buyer_id;
  const hasHighInterest = wantedListing.response_count >= 7;
  const isAtMaxResponses = wantedListing.response_count >= 10;

  return (
    <>
      <div className="min-h-screen bg-bg">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Game Image */}
            <div>
              <Card padding="none" className="overflow-hidden">
                <div className="relative bg-polar-night/5 flex items-center justify-center min-h-[500px]">
                  {wantedListing.game?.image ? (
                    <img
                      src={wantedListing.game.image}
                      alt={wantedListing.game_name}
                      className="max-w-full max-h-full object-contain p-8"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-text-muted" />
                  )}

                  {/* WANTED Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-aurora-orange backdrop-blur-sm rounded-md text-xs text-snow-white font-bold uppercase tracking-wide shadow-lg">
                    Wanted
                  </div>

                  {/* Status Badge */}
                  {isExpired && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-surface-2 backdrop-blur-sm rounded-md text-xs text-text-disabled font-medium">
                      Expired
                    </div>
                  )}
                  {!isExpired && isExpiringSoon && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-aurora-red/90 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium">
                      {timeRemainingText}
                    </div>
                  )}
                  {hasHighInterest && !isExpired && (
                    <div className="absolute bottom-4 right-4 px-2 py-1 bg-aurora-orange/90 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Hot
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Title and Budget */}
              <div>
                <h1 className="text-3xl font-bold text-polar-night mb-4">
                  {wantedListing.game_name}
                  {wantedListing.game_year && (
                    <span className="text-text-muted font-normal"> ({wantedListing.game_year})</span>
                  )}
                </h1>

                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-aurora-orange">
                    {budgetDisplay}
                  </span>
                  <Badge className={getWantedStatusBadgeColor(wantedListing.status)} size="lg">
                    {getWantedStatusLabel(wantedListing.status)}
                  </Badge>
                </div>
              </div>

              {/* Game Information (BGG Data) */}
              {(wantedListing.game?.player_count || wantedListing.game?.min_age || wantedListing.game?.playing_time || wantedListing.game?.is_expansion || wantedListing.bgg_game_id) && (
                <Card padding="md">
                  <div className="space-y-3">
                    {/* Metadata Icons */}
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary items-center">
                      {wantedListing.game?.player_count && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {wantedListing.game.player_count}
                        </span>
                      )}
                      {wantedListing.game?.min_age && (
                        <span className="flex items-center gap-1.5">
                          <Baby className="w-4 h-4" />
                          {wantedListing.game.min_age}+
                        </span>
                      )}
                      {wantedListing.game?.playing_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {wantedListing.game.playing_time}
                        </span>
                      )}
                      {wantedListing.game?.is_expansion && (
                        <Badge variant="warning" size="sm">
                          Expansion
                        </Badge>
                      )}
                      {wantedListing.bgg_game_id && (
                        <a
                          href={`https://boardgamegeek.com/boardgame/${wantedListing.bgg_game_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-aurora-orange hover:text-aurora-orange/80 transition-colors font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View on BGG</span>
                        </a>
                      )}
                    </div>

                    {/* Powered by BGG */}
                    <div className="pt-2 border-t border-border-subtle">
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
                </Card>
              )}

              {/* Acceptable Conditions */}
              <Card padding="md">
                <h3 className="font-semibold text-polar-night mb-3">Acceptable Conditions</h3>
                <div className="flex flex-wrap gap-2">
                  {wantedListing.acceptable_conditions.map((condition) => (
                    <Badge key={condition} variant={condition as any}>
                      {getConditionLabel(condition)}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Location & Details */}
              {(wantedListing.location_preferences || wantedListing.preferred_language || wantedListing.notes) && (
                <Card padding="md">
                  <h3 className="font-semibold text-polar-night mb-3">Preferences & Details</h3>

                  <div className="space-y-3 text-sm">
                    {wantedListing.location_preferences && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-aurora-orange" />
                        <div>
                          <p className="text-xs text-text-secondary mb-0.5">Location Preference</p>
                          <p className="text-polar-night">{wantedListing.location_preferences}</p>
                        </div>
                      </div>
                    )}

                    {wantedListing.preferred_language && (
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-aurora-orange" />
                        <div>
                          <p className="text-xs text-text-secondary mb-0.5">Preferred Language</p>
                          <p className="text-polar-night">{wantedListing.preferred_language}</p>
                        </div>
                      </div>
                    )}

                    {wantedListing.notes && (
                      <div className="pt-3 border-t border-border-subtle">
                        <p className="text-xs text-text-secondary mb-1">Additional Details</p>
                        <p className="text-polar-night leading-relaxed whitespace-pre-wrap">
                          {wantedListing.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Response Progress */}
              <Card padding="md">
                <h3 className="font-semibold text-polar-night mb-3">Seller Interest</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Responses</span>
                    <span className="font-bold text-polar-night">
                      {wantedListing.response_count}/10
                    </span>
                  </div>
                  <div className="w-full bg-surface-1 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        wantedListing.response_count >= 7
                          ? 'bg-aurora-orange'
                          : 'bg-aurora-orange/50'
                      }`}
                      style={{ width: `${(wantedListing.response_count / 10) * 100}%` }}
                    />
                  </div>
                  {hasHighInterest && (
                    <p className="text-xs text-aurora-orange flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      High interest listing!
                    </p>
                  )}
                  {!isExpired && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary pt-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{timeRemainingText}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Button */}
              {!isOwnListing && wantedListing.status === 'active' && !isExpired && !isAtMaxResponses && (
                <Button
                  variant="accent"
                  size="lg"
                  fullWidth
                  onClick={handleIHaveThisClick}
                >
                  I Have This Game
                </Button>
              )}

              {isAtMaxResponses && !isOwnListing && (
                <div className="p-4 bg-surface-1 rounded-lg border border-border-subtle text-center text-sm text-text-secondary">
                  This listing has reached the maximum number of responses (10)
                </div>
              )}

              {isExpired && !isOwnListing && (
                <div className="p-4 bg-surface-1 rounded-lg border border-border-subtle text-center text-sm text-text-disabled">
                  This listing has expired
                </div>
              )}

              {!isOwnListing && (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" size="lg" fullWidth>
                    <Heart className="w-5 h-5 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>
              )}

              {/* Buyer Info */}
              <Card padding="md">
                <h3 className="font-semibold text-polar-night mb-3">Buyer</h3>

                {wantedListing.buyer ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      {wantedListing.buyer.avatar_url ? (
                        <img
                          src={wantedListing.buyer.avatar_url}
                          alt={wantedListing.buyer.full_name}
                          className="w-12 h-12 rounded-lg object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-aurora-orange/20 flex items-center justify-center text-lg font-semibold text-aurora-orange">
                          {wantedListing.buyer.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-polar-night">
                          {wantedListing.buyer.full_name}
                          {wantedListing.buyer.country && getCountryFlag(wantedListing.buyer.country) && (
                            <span
                              className={`${getCountryFlag(wantedListing.buyer.country)} ml-2`}
                              role="img"
                              aria-label={`Country: ${getCountryName(wantedListing.buyer.country)}`}
                              title={getCountryName(wantedListing.buyer.country)}
                            />
                          )}
                        </div>
                        <div className="text-sm text-text-secondary">
                          Member since {new Date(wantedListing.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </div>
                      </div>
                    </div>

                    {isOwnListing && (
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={() => router.push('/my-listings?tab=wanted')}
                      >
                        Manage My Wanted Listings
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-text-muted/20 flex items-center justify-center text-lg font-semibold text-text-muted">
                        ?
                      </div>
                      <div>
                        <div className="font-medium text-text-muted">
                          Deleted User
                        </div>
                        <div className="text-sm text-text-secondary">
                          Account no longer active
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-aurora-red/10 rounded-lg border border-aurora-red/20">
                      <p className="text-xs text-aurora-red">
                        This wanted listing is no longer active.
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {wantedListing && (
        <OfferModal
          open={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          wantedListing={wantedListing}
          onSubmit={handleOfferSubmit}
        />
      )}
    </>
  );
}
