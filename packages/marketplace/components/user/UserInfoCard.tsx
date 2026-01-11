'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarSize } from './Avatar';
import { CountryDisplay, CountryDisplayMode } from './CountryDisplay';
import { SellerTrustCompact } from '@/components/seller/SellerTrustBadge';
import { SellerBadgeTier, getSellerBadgeTier } from '@/lib/types/seller';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  name: string;
  avatarUrl: string | null;
  country: string | null;
}

interface SellerData {
  totalSales: number;
  averageRating: number;
  totalReviews: number;
  badgeTier?: SellerBadgeTier;
}

export interface UserInfoCardProps {
  /** Core user data */
  user: UserData;
  /** Size variant for avatar */
  size?: AvatarSize;
  /** Country display mode */
  countryDisplay?: CountryDisplayMode;
  /** Seller data - when provided, shows trust badge */
  seller?: SellerData;
  /** Member since date (ISO string) */
  memberSince?: string | null;
  /** Show member since date */
  showMemberSince?: boolean;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
  /** Compact mode - reduces spacing */
  compact?: boolean;
  /** Link name to profile page */
  linkToProfile?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Unified user info card component.
 * Displays user avatar, name, country, and optionally seller trust info.
 */
export function UserInfoCard({
  user,
  size = 'md',
  countryDisplay = 'flag',
  seller,
  memberSince,
  showMemberSince = false,
  layout = 'horizontal',
  compact = false,
  linkToProfile = true,
  className,
}: UserInfoCardProps) {
  const locale = useLocale();
  const t = useTranslations('UserCard');
  const profileUrl = `/${locale}/profile/${user.id}`;

  // Calculate badge tier if seller data provided but no tier specified
  const badgeTier = seller
    ? seller.badgeTier ?? getSellerBadgeTier(seller.totalSales, seller.averageRating)
    : undefined;

  // Size-based text styles
  const textSizes: Record<AvatarSize, { name: string; meta: string }> = {
    xs: { name: 'text-xs', meta: 'text-[10px]' },
    sm: { name: 'text-sm', meta: 'text-xs' },
    md: { name: 'text-sm', meta: 'text-xs' },
    lg: { name: 'text-base', meta: 'text-sm' },
    xl: { name: 'text-xl', meta: 'text-base' },
    '2xl': { name: 'text-2xl', meta: 'text-base' },
  };

  const textStyle = textSizes[size];

  // Gap sizes based on compact mode and layout
  const gapClass = compact
    ? layout === 'vertical' ? 'gap-1' : 'gap-1.5'
    : layout === 'vertical' ? 'gap-2' : 'gap-2.5';

  const nameClassName = cn(
    'font-medium text-slate-800',
    linkToProfile && 'hover:text-frost-600 transition-colors focus:outline-none focus:ring-2 focus:ring-frost-500 focus:ring-offset-1 rounded',
    textStyle.name
  );

  return (
    <div
      className={cn(
        'flex',
        layout === 'vertical' ? 'flex-col items-center text-center' : 'items-center',
        gapClass,
        className
      )}
    >
      {/* Avatar */}
      <Avatar src={user.avatarUrl} name={user.name} size={size} />

      {/* User info */}
      <div
        className={cn(
          'flex',
          layout === 'vertical' ? 'flex-col items-center gap-1' : 'flex-col gap-0.5',
          compact && layout === 'horizontal' && 'gap-0'
        )}
      >
        {/* Name and Country row */}
        <div
          className={cn(
            'flex items-center',
            layout === 'vertical' ? 'justify-center' : '',
            compact ? 'gap-1' : 'gap-1.5'
          )}
        >
          {linkToProfile ? (
            <Link href={profileUrl} className={nameClassName}>
              {user.name}
            </Link>
          ) : (
            <span className={nameClassName}>
              {user.name}
            </span>
          )}
          <CountryDisplay countryCode={user.country} mode={countryDisplay} />
        </div>

        {/* Seller trust info */}
        {seller && (
          <SellerTrustCompact
            totalSales={seller.totalSales}
            averageRating={seller.averageRating}
            totalReviews={seller.totalReviews}
            badgeTier={badgeTier}
            className={textStyle.meta}
          />
        )}

        {/* Member since */}
        {showMemberSince && memberSince && (
          <span className={cn('text-slate-500', textStyle.meta)}>
            {t('memberSince', { year: new Date(memberSince).getFullYear() })}
          </span>
        )}
      </div>
    </div>
  );
}
