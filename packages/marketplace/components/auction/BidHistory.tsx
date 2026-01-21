'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Time as Clock, Flash as Zap, ChevronDown, Trophy } from 'griddy-icons';
import type { BidWithBidder } from '@/lib/types/listing';

interface BidHistoryProps {
  listingId: string;
}

function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

export function BidHistory({ listingId }: BidHistoryProps) {
  const t = useTranslations('Auction.bidHistory');
  const [bids, setBids] = useState<BidWithBidder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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
      <div className="pt-2 border-t border-border-subtle">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-bg-secondary rounded w-1/4"></div>
          <div className="h-6 bg-bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="pt-2 border-t border-border-subtle">
        <p className="text-xs text-text-muted text-center py-2">
          {t('noBidsYet')}
        </p>
      </div>
    );
  }

  // Show only top 3 bids unless history is expanded
  const visibleBids = isHistoryExpanded ? bids : bids.slice(0, 3);
  const hasMoreBids = bids.length > 3;

  return (
    <div className="pt-2 border-t border-border-subtle">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
        className="w-full flex items-center justify-between text-left py-1 group"
      >
        <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary">
          {t('title')} ({bids.length})
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${
            isHistoryExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Bid list - always show at least first bid, expand for more */}
      <div className="space-y-1.5 mt-2">
        {visibleBids.map((bid) => (
          <div
            key={bid.id}
            className={`rounded transition-colors ${
              bid.is_winning
                ? 'bg-aurora-green/10 border border-aurora-green/30 p-2'
                : 'bg-bg-secondary p-1.5'
            }`}
          >
            {/* Winning bid row - enhanced but compact */}
            {bid.is_winning ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="success"
                    size="sm"
                    icon={<Trophy className="w-2.5 h-2.5" />}
                  >
                    {t('winning')}
                  </Badge>
                  <span className="text-xs font-medium text-aurora-green truncate">
                    {bid.bidder.display_name}
                  </span>
                  {bid.triggered_extension && (
                    <span title={t('extendedAuction')}>
                      <Zap className="w-3 h-3 text-aurora-yellow flex-shrink-0" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-aurora-green">
                    €{bid.amount.toFixed(2)}
                  </span>
                  <span className="text-xs text-text-muted hidden sm:flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatRelativeTime(bid.created_at)}
                  </span>
                </div>
              </div>
            ) : (
              /* Non-winning bids - de-emphasized */
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-text-secondary truncate">
                    {bid.bidder.display_name}
                  </span>
                  {bid.triggered_extension && (
                    <span title={t('extendedAuction')}>
                      <Zap className="w-2.5 h-2.5 text-aurora-yellow flex-shrink-0" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-text-secondary">
                    €{bid.amount.toFixed(2)}
                  </span>
                  <span className="text-xs text-text-muted hidden sm:flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatRelativeTime(bid.created_at)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more/less for bid history */}
      {hasMoreBids && (
        <button
          type="button"
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="w-full mt-2 py-1 text-xs text-text-muted hover:text-text-secondary flex items-center justify-center gap-1 transition-colors"
        >
          {isHistoryExpanded
            ? t('showLess')
            : t('showMore', { count: bids.length - 3 })}
        </button>
      )}
    </div>
  );
}
