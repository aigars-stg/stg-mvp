/* eslint-disable @next/next/no-img-element -- seller avatars are external URLs */
'use client';

import { Star, Shield, Sparks as Sparkles, User } from '@/lib/icons';
import {
  SellerBadgeTier,
  SellerTrustInfo,
  getSellerBadgeTier,
  formatMemberSince,
} from '@/lib/types/seller';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface SellerTrustBadgeProps {
  /** Seller trust information */
  trust: SellerTrustInfo;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show member since date */
  showMemberSince?: boolean;
  /** Show seller name */
  showName?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Displays seller trust signals: rating, sales count, and badge tier
 */
export function SellerTrustBadge({
  trust,
  size = 'md',
  showMemberSince = false,
  showName = false,
  showAvatar = false,
  className,
}: SellerTrustBadgeProps) {
  const t = useTranslations('SellerDashboard.SellerTrustBadge');
  const {
    sellerName,
    sellerAvatar,
    sellerCountry,
    totalSales,
    averageRating,
    totalReviews,
    badgeTier,
    memberSince,
    isFoundingSeller,
  } = trust;

  // Size-based styles
  const sizeStyles = {
    sm: {
      container: 'gap-1 text-xs',
      avatar: 'w-4 h-4',
      star: 'w-3 h-3',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    md: {
      container: 'gap-1.5 text-sm',
      avatar: 'w-5 h-5',
      star: 'w-3.5 h-3.5',
      badge: 'text-xs px-2 py-0.5',
    },
    lg: {
      container: 'gap-2 text-base',
      avatar: 'w-6 h-6',
      star: 'w-4 h-4',
      badge: 'text-sm px-2.5 py-1',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn('flex items-center flex-wrap', styles.container, className)}>
      {/* Avatar and Name */}
      {showAvatar && (
        <div className={cn('rounded-full overflow-hidden bg-bg-secondary flex-shrink-0', styles.avatar)}>
          {sellerAvatar ? (
            <img
              src={sellerAvatar}
              alt={sellerName || 'Seller'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <User className={cn(styles.star)} />
            </div>
          )}
        </div>
      )}

      {showName && sellerName && (
        <span className="font-medium text-text truncate max-w-[120px]">
          {sellerName}
        </span>
      )}

      {sellerCountry && (
        <span className="text-text-muted" title={t('shipsFrom', { country: sellerCountry })}>
          {getCountryFlag(sellerCountry)}
        </span>
      )}

      {/* Rating */}
      {totalReviews > 0 ? (
        <div className="flex items-center gap-0.5 text-text-secondary">
          <Star className={cn(styles.star, 'text-amber-400')} weight="fill" />
          <span className="font-medium">{averageRating.toFixed(1)}</span>
        </div>
      ) : null}

      {/* Sales count */}
      <span className="text-text-muted">
        ({totalSales} {totalSales === 1 ? t('sale') : t('sales')})
      </span>

      {/* Badge tier */}
      <BadgeTierPill tier={badgeTier} size={size} />
      {isFoundingSeller && <FoundingSellerPill size={size} />}

      {/* Member since */}
      {showMemberSince && memberSince && (
        <span className="text-text-muted">
          {formatMemberSince(memberSince)}
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for tight spaces (e.g., listing cards)
 */
export function SellerTrustCompact({
  totalSales,
  averageRating,
  totalReviews,
  badgeTier,
  className,
}: {
  totalSales: number;
  averageRating: number;
  totalReviews: number;
  badgeTier?: SellerBadgeTier;
  className?: string;
}) {
  const t = useTranslations('SellerDashboard.SellerTrustBadge');
  const tier = badgeTier || getSellerBadgeTier(totalSales, averageRating);

  // Nothing to show for sellers with no sales and no reviews
  if (totalSales === 0 && totalReviews === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1 text-xs text-text-muted', className)}>
      {totalReviews > 0 && (
        <>
          <Star className="w-3 h-3 text-amber-400" weight="fill" />
          <span className="font-medium text-text-secondary">{averageRating.toFixed(1)}</span>
        </>
      )}
      {totalSales > 0 && (
        <span>({totalSales} {totalSales === 1 ? t('sale') : t('sales')})</span>
      )}
      {tier !== 'new_seller' && (
        <BadgeTierPill tier={tier} size="sm" />
      )}
    </div>
  );
}

/**
 * Badge tier pill component
 */
function BadgeTierPill({
  tier,
  size = 'md',
}: {
  tier: SellerBadgeTier;
  size?: 'sm' | 'md' | 'lg';
}) {
  const t = useTranslations('SellerDashboard.SellerTrustBadge');
  const tierConfig = {
    top_seller: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Sparkles,
      label: t('badges.topSeller'),
    },
    trusted_seller: {
      bg: 'bg-frost-100',
      text: 'text-frost-700',
      border: 'border-frost-200',
      icon: Shield,
      label: t('badges.trustedSeller'),
    },
    new_seller: {
      bg: 'bg-bg-secondary',
      text: 'text-text-secondary',
      border: 'border-border-subtle',
      icon: User,
      label: t('badges.newSeller'),
    },
  };

  const config = tierConfig[tier];
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  // Don't show badge for new sellers in compact views
  if (tier === 'new_seller' && size === 'sm') {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bg,
        config.text,
        config.border,
        sizeStyles[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}

/**
 * Founding seller recognition pill — shown alongside trust badge
 */
export function FoundingSellerPill({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const t = useTranslations('SellerDashboard.SellerTrustBadge');

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        'bg-aurora-green/10 text-aurora-green border-aurora-green/20',
        sizeStyles[size]
      )}
    >
      <Sparkles className={iconSizes[size]} />
      {t('badges.foundingSeller')}
    </span>
  );
}

/**
 * Star rating display component
 */
export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = true,
  className,
}: {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}) {
  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {Array.from({ length: maxRating }).map((_, i) => {
          const filled = i < Math.floor(rating);
          const partial = !filled && i < rating;

          return (
            <Star
              key={i}
              className={cn(
                starSizes[size],
                filled || partial ? 'text-amber-400' : 'text-snow-storm',
                filled ? 'fill-amber-400' : partial ? 'fill-amber-400/50' : ''
              )}
            />
          );
        })}
      </div>
      {showValue && (
        <span className={cn('font-medium text-text-secondary', textSizes[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/**
 * Get country flag emoji from country code
 */
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export { BadgeTierPill };
