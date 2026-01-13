'use client';

import { useState, useEffect } from 'react';
import { Card } from '@second-turn/design-system';
import { useTranslations, useLocale } from 'next-intl';
import { Clock, Zap, ChevronDownCircle as ChevronDown } from 'griddy-icons';
import type { BidWithBidder } from '@/lib/types/listing';

interface BidHistoryProps {
  listingId: string;
}

export function BidHistory({ listingId }: BidHistoryProps) {
  const t = useTranslations('Auction.bidHistory');
  const locale = useLocale();
  const [bids, setBids] = useState<BidWithBidder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchBids = async () => {
      try {
        const res = await fetch(`/api/auctions/${listingId}/bids?limit=10`);
        if (res.ok) {
          const data = await res.json();
          setBids(data.bids);
        }
      } catch (err) {
        console.error('Failed to fetch bids:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBids();

    // Refresh bid history periodically (every 10 seconds)
    const interval = setInterval(fetchBids, 10000);
    return () => clearInterval(interval);
  }, [listingId]);

  if (isLoading) {
    return (
      <Card>
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-bg-secondary rounded w-1/3"></div>
            <div className="h-8 bg-bg-secondary rounded"></div>
            <div className="h-8 bg-bg-secondary rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (bids.length === 0) {
    return (
      <Card>
        <div className="p-4 text-center text-text-muted">
          {t('noBidsYet')}
        </div>
      </Card>
    );
  }

  // Show only top 3 bids unless expanded
  const visibleBids = isExpanded ? bids : bids.slice(0, 3);
  const hasMoreBids = bids.length > 3;

  return (
    <Card>
      <div className="p-4">
        <h4 className="text-sm font-semibold text-polar-night mb-3">
          {t('title')}
        </h4>

        <div className="space-y-2">
          {visibleBids.map((bid, index) => (
            <div
              key={bid.id}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                bid.is_winning
                  ? 'bg-aurora-green/10 border border-aurora-green/30'
                  : 'bg-bg-secondary'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-sm font-medium truncate ${
                    bid.is_winning ? 'text-aurora-green' : 'text-text-primary'
                  }`}
                >
                  {bid.bidder.display_name}
                </span>
                {bid.triggered_extension && (
                  <span
                    title={t('extendedAuction')}
                    className="flex-shrink-0"
                  >
                    <Zap className="w-3 h-3 text-aurora-yellow" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`font-semibold ${
                    bid.is_winning ? 'text-aurora-green' : 'text-text-primary'
                  }`}
                >
                  EUR {bid.amount.toFixed(2)}
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(bid.created_at).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {hasMoreBids && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
            {isExpanded
              ? t('showLess')
              : t('showMore', { count: bids.length - 3 })}
          </button>
        )}
      </div>
    </Card>
  );
}
