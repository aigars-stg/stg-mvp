'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { Button, Input, Card, Badge } from '@second-turn/design-system';
import {
  Tag as Gavel,
  Time as Clock,
  AlertCircle,
  CheckCircleAlt01 as CheckCircle2,
  RefreshCw,
  Flash as Zap,
  ChevronDown,
} from 'griddy-icons';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAuctionRealtime } from '@/lib/hooks/useAuctionRealtime';
import { useUserBidStatus } from '@/lib/hooks/useUserBidStatus';
import {
  type Listing,
  getAuctionTimeRemaining,
  getMinimumBid,
  formatCompactTimeRemaining,
} from '@/lib/types/listing';
import { BidHistory } from './BidHistory';
import { formatPrice } from '@/lib/services/pricing';

interface AuctionBidPanelProps {
  listing: Listing;
  onBidPlaced?: () => void;
}

export function AuctionBidPanel({ listing, onBidPlaced }: AuctionBidPanelProps) {
  const { user } = useAuth();
  const t = useTranslations('Auction');

  const [isExpanded, setIsExpanded] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Real-time auction state
  const {
    currentBid,
    bidCount,
    endsAt,
    wasExtended,
    broadcastBid,
  } = useAuctionRealtime({
    listingId: listing.id,
    initialCurrentBid: listing.auction_current_bid || null,
    initialBidCount: listing.auction_bid_count || 0,
    initialEndsAt: listing.auction_ends_at || '',
    onBidReceived: (event) => {
      // Show notification when someone else places a bid
      if (event.was_extended) {
        setSuccess(t('notifications.extended', { minutes: 3 }));
        setTimeout(() => setSuccess(null), 5000);
      }
    },
  });

  // User's bid status (winning/outbid)
  const {
    hasBid: userHasBid,
    isWinning: userIsWinning,
    refetch: refetchBidStatus,
  } = useUserBidStatus({
    listingId: listing.id,
    currentBid,
  });

  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState(getAuctionTimeRemaining(endsAt));

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getAuctionTimeRemaining(endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  // Calculate minimum bid
  const minimumBid = getMinimumBid({
    ...listing,
    auction_current_bid: currentBid,
  });

  const handlePlaceBid = async () => {
    if (!user) {
      setError(t('errors.loginRequired'));
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minimumBid) {
      setError(t('errors.minimumBid', { amount: minimumBid.toFixed(2) }));
      return;
    }

    setIsPlacingBid(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/auctions/${listing.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('errors.failed'));
        return;
      }

      // Broadcast the bid to other subscribers
      broadcastBid({
        listing_id: listing.id,
        bid_id: data.bid_id,
        amount: data.amount,
        bid_count: bidCount + 1,
        ends_at: data.new_end_time,
        was_extended: data.was_extended,
      });

      // Show success message
      if (data.was_extended) {
        setSuccess(
          t('success.bidPlacedExtended', {
            amount: amount.toFixed(2),
            minutes: data.extension_minutes,
          })
        );
      } else {
        setSuccess(t('success.bidPlaced', { amount: amount.toFixed(2) }));
      }

      setBidAmount('');
      onBidPlaced?.();
      refetchBidStatus();

      // Clear success after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch {
      setError(t('errors.failed'));
    } finally {
      setIsPlacingBid(false);
    }
  };

  const isOwnAuction = user?.id === listing.seller_id;
  const isEnded = timeRemaining.isEnded;
  const isWinner = listing.auction_winner_id === user?.id;
  const displayPrice = currentBid || listing.auction_start_price || 0;

  // Auto-expand for winner
  useEffect(() => {
    if (isEnded && isWinner) {
      setIsExpanded(true);
    }
  }, [isEnded, isWinner]);

  return (
    <Card className="border-2 border-aurora-purple/30 overflow-hidden">
      {/* Collapsed Summary Row - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 sm:p-4 text-left hover:bg-bg-secondary/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Badge + Price */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
              {t('badge')}
            </Badge>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-bold text-aurora-purple text-lg">
                {formatPrice(displayPrice)}
              </span>
              <span className="text-xs text-text-muted whitespace-nowrap">
                ({bidCount} {bidCount === 1 ? t('bid') : t('bids')})
              </span>
            </div>
          </div>

          {/* Center: Timer */}
          <div
            className={`hidden sm:flex items-center gap-1.5 text-sm px-2 py-1 rounded ${
              timeRemaining.isEndingSoon
                ? 'bg-aurora-red/10 text-aurora-red'
                : isEnded
                  ? 'bg-bg-secondary text-text-muted'
                  : 'text-text-secondary'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {isEnded ? t('ended') : formatCompactTimeRemaining(timeRemaining)}
            </span>
            {wasExtended && !isEnded && (
              <span title={t('wasExtended')}>
                <Zap className="w-3 h-3 text-aurora-purple" />
              </span>
            )}
          </div>

          {/* Right: Status + Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEnded && userHasBid && !isOwnAuction && (
              <Badge
                variant={userIsWinning ? 'success' : 'warning'}
                size="sm"
              >
                {userIsWinning ? '✓' : '⚠'}
              </Badge>
            )}
            {isEnded && isWinner && (
              <Badge variant="success" size="sm">
                {t('won')}
              </Badge>
            )}
            <ChevronDown
              className={`w-5 h-5 text-text-muted transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Mobile: Timer on second row */}
        <div
          className={`sm:hidden flex items-center gap-1.5 text-sm mt-2 ${
            timeRemaining.isEndingSoon
              ? 'text-aurora-red'
              : isEnded
                ? 'text-text-muted'
                : 'text-text-secondary'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-mono">
            {isEnded ? t('ended') : formatCompactTimeRemaining(timeRemaining)}
          </span>
          {wasExtended && !isEnded && (
            <span title={t('wasExtended')}>
              <Zap className="w-3 h-3 text-aurora-purple" />
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border-subtle p-3 sm:p-4 space-y-3">
          {/* User Bid Status Banner */}
          {!isEnded && userHasBid && !isOwnAuction && (
            <div
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm ${
                userIsWinning
                  ? 'bg-aurora-green/10 text-aurora-green border border-aurora-green/30'
                  : 'bg-aurora-yellow/10 text-aurora-yellow border border-aurora-yellow/30'
              }`}
            >
              {userIsWinning ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">{t('status.highBidder')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">{t('status.outbid')}</span>
                </>
              )}
            </div>
          )}

          {/* Bid Input */}
          {!isEnded && !isOwnAuction && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  {t('minimum')}: {formatPrice(minimumBid)}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                      €
                    </span>
                    <Input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={minimumBid.toFixed(2)}
                      min={minimumBid}
                      step="1"
                      inputSize="md"
                      className="pl-8"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handlePlaceBid}
                    disabled={isPlacingBid || !bidAmount}
                    className="bg-aurora-purple hover:bg-aurora-purple/90 px-4"
                  >
                    {isPlacingBid ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Gavel className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-aurora-red bg-aurora-red/10 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-aurora-green bg-aurora-green/10 p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Winner Message */}
          {isEnded && isWinner && (
            <div className="text-center p-3 bg-aurora-green/10 border border-aurora-green/30 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-aurora-green mx-auto mb-1.5" />
              <h3 className="font-semibold text-aurora-green text-sm mb-1">{t('youWon')}</h3>
              <p className="text-xs text-text-secondary mb-2">
                {t('completePayment')}
              </p>
              <Link href={`/checkout/auction/${listing.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-aurora-green hover:bg-aurora-green/90"
                >
                  {t('payNow')}
                </Button>
              </Link>
            </div>
          )}

          {/* Own Auction Message */}
          {isOwnAuction && (
            <div className="text-xs text-text-muted text-center py-1">
              {t('ownAuction')}
            </div>
          )}

          {/* Bid History - integrated inline */}
          <BidHistory listingId={listing.id} />
        </div>
      )}
    </Card>
  );
}
