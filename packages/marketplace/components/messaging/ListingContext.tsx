'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LinkExternal as ExternalLink } from '@/lib/icons';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import type { Conversation } from '@/lib/types/message';
import { formatPrice } from '@/lib/services/pricing';

interface ListingContextProps {
  conversation: Conversation;
}

export function ListingContext({ conversation }: ListingContextProps) {
  const t = useTranslations('ListingStatus');
  const { listing } = conversation;

  if (!listing) {
    return null;
  }

  const statusStyles: Record<string, string> = {
    active: 'bg-aurora-green/10 text-aurora-green',
    sold: 'bg-text-muted/10 text-text-muted',
    removed: 'bg-aurora-red/10 text-aurora-red',
    draft: 'bg-aurora-yellow/10 text-aurora-yellow',
  };

  const statusKey = (listing.status as string) || 'active';
  const statusClassName = statusStyles[statusKey] || statusStyles.active;
  const statusLabel = t(statusKey as 'active' | 'sold' | 'removed' | 'draft');

  return (
    <div className="border-b border-snow-storm bg-bg-elevated">
      <Link
        href={`/game/${listing.game_id}`}
        className="flex items-center gap-3 p-4 hover:bg-bg-secondary transition-colors group"
      >
        {/* Listing thumbnail */}
        <ListingThumbnail
          src={listing.photos?.[0] || null}
          alt={listing.title}
          size="md"
          objectFit="cover"
        />

        {/* Listing details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-text group-hover:text-frost-ice transition-colors truncate">
              {listing.title}
            </h3>
            <ExternalLink className="w-4 h-4 text-text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-semibold text-text">
              {formatPrice(listing.price)}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClassName}`}
            >
              {statusLabel}
            </span>
          </div>

          {listing.game_name && (
            <p className="text-xs text-text-secondary mt-1 truncate">
              {listing.game_name}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
