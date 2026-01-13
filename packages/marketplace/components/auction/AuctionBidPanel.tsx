'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Card } from '@second-turn/design-system';
import { Gavel, Clock, AlertCircle, CheckCircleAlt01 as CheckCircle2, RefreshCw, Zap } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAuctionRealtime } from '@/lib/hooks/useAuctionRealtime';
import {
  type Listing,
  getAuctionTimeRemaining,
  getMinimumBid,
  formatAuctionTimeRemaining,
} from '@/lib/types/listing';
import { BidHistory } from './BidHistory';

interface AuctionBidPanelProps {
  listing: Listing;
  onBidPlaced?: () => void;
}

export function AuctionBidPanel({ listing, onBidPlaced }: AuctionBidPanelProps) {
  const { user } = useAuth();
  const t = useTranslations('Auction');

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
      // Could redirect to login
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

      // Clear success after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(t('errors.failed'));
    } finally {
      setIsPlacingBid(false);
    }
  };

  const isOwnAuction = user?.id === listing.seller_id;
  const isEnded = timeRemaining.isEnded;
  const isWinner = listing.auction_winner_id === user?.id;

  return (
    <div className="space-y-4">
      {/* Main Bid Panel */}
      <Card className="border-2 border-aurora-purple/30">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-aurora-purple" />
              <span className="font-semibold text-polar-night">{t('title')}</span>
            </div>
            <span className="text-sm text-text-muted">
              {bidCount} {bidCount === 1 ? t('bid') : t('bids')}
            </span>
          </div>

          {/* Current Bid / Starting Price */}
          <div className="text-center py-4 bg-aurora-purple/5 rounded-lg">
            <div className="text-sm text-text-secondary mb-1">
              {currentBid ? t('currentBid') : t('startingPrice')}
            </div>
            <div className="text-3xl font-bold text-aurora-purple">
              EUR {(currentBid || listing.auction_start_price || 0).toFixed(2)}
            </div>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center justify-center gap-2 py-3 rounded-lg ${
              timeRemaining.isEndingSoon
                ? 'bg-aurora-red/10 text-aurora-red'
                : 'bg-bg-secondary text-text-secondary'
            }`}
          >
            <Clock className="w-4 h-4" />
            {isEnded ? (
              <span className="font-semibold">{t('ended')}</span>
            ) : (
              <>
                <span className="font-mono text-lg">
                  {formatAuctionTimeRemaining(timeRemaining)}
                </span>
                {timeRemaining.isEndingSoon && (
                  <span className="text-xs font-medium ml-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {t('endingSoon')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Extended Notice */}
          {wasExtended && !isEnded && (
            <div className="flex items-center gap-2 text-xs text-aurora-purple bg-aurora-purple/10 p-2 rounded">
              <Zap className="w-3 h-3" />
              {t('wasExtended')}
            </div>
          )}

          {/* Bid Input */}
          {!isEnded && !isOwnAuction && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">
                  {t('yourBid')} ({t('minimum')}: EUR {minimumBid.toFixed(2)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                    EUR
                  </span>
                  <Input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={minimumBid.toFixed(2)}
                    min={minimumBid}
                    step="1"
                    inputSize="lg"
                    className="pl-14"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={handlePlaceBid}
                disabled={isPlacingBid || !bidAmount}
                className="bg-aurora-purple hover:bg-aurora-purple/90"
              >
                {isPlacingBid ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Gavel className="w-4 h-4 mr-2" />
                )}
                {t('placeBid')}
              </Button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-aurora-red bg-aurora-red/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-aurora-green bg-aurora-green/10 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Winner Message */}
          {isEnded && isWinner && (
            <div className="text-center p-4 bg-aurora-green/10 border border-aurora-green/30 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-aurora-green mx-auto mb-2" />
              <h3 className="font-semibold text-aurora-green mb-1">{t('youWon')}</h3>
              <p className="text-sm text-text-secondary mb-3">
                {t('completePayment')}
              </p>
              <Button
                variant="primary"
                href={`/checkout/auction/${listing.id}`}
                className="bg-aurora-green hover:bg-aurora-green/90"
              >
                {t('payNow')}
              </Button>
            </div>
          )}

          {/* Own Auction Message */}
          {isOwnAuction && (
            <div className="text-sm text-text-muted text-center py-2">
              {t('ownAuction')}
            </div>
          )}
        </div>
      </Card>

      {/* Bid History */}
      <BidHistory listingId={listing.id} />
    </div>
  );
}
