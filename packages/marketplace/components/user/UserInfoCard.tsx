'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarSize } from './Avatar';
import { CountryDisplay, CountryDisplayMode } from '@second-turn/design-system';
import { SellerTrustCompact } from '@/components/seller/SellerTrustBadge';
import { SellerBadgeTier, getSellerBadgeTier } from '@/lib/types/seller';
import { cn } from '@/lib/utils';
import { Check, Close, Edit as Pencil } from '@/lib/icons';
import { AvatarUpload } from '@/components/auth/AvatarUpload';
import { CountrySelector } from '@/components/auth/CountrySelector';
import type { CountryCode } from '@/lib/country-utils';

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

// Avatar size → AvatarUpload size class mapping
const avatarUploadSizeMap: Partial<Record<AvatarSize, { container: string; initials: string }>> = {
  lg: { container: 'w-12 h-12', initials: 'text-base' },
  xl: { container: 'w-20 h-20', initials: 'text-2xl' },
  '2xl': { container: 'w-24 h-24', initials: 'text-3xl' },
};

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
  /** Enable inline editing of avatar, name, and country */
  editable?: boolean;
  /** Called when avatar is uploaded or removed (editable mode) */
  onAvatarChange?: (url: string) => void;
  /** Called when name is saved (editable mode). Throw to signal error. */
  onNameSave?: (name: string) => Promise<void>;
  /** Called when country is saved (editable mode). Throw to signal error. */
  onCountrySave?: (country: string) => Promise<void>;
  /** Additional className */
  className?: string;
}

/**
 * Unified user info card component.
 * Displays user avatar, name, country, and optionally seller trust info.
 * Supports an editable mode for account settings.
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
  editable = false,
  onAvatarChange,
  onNameSave,
  onCountrySave,
  className,
}: UserInfoCardProps) {
  const locale = useLocale();
  const t = useTranslations('UserCard');
  const profileUrl = `/profile/${user.id}`;

  // Editable state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user.name);
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [countryValue, setCountryValue] = useState<CountryCode | ''>(user.country as CountryCode || '');
  const [saving, setSaving] = useState(false);

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
    'font-medium text-polar-night',
    !editable && linkToProfile && 'hover:text-frost-polar transition-colors focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-1 rounded',
    textStyle.name
  );

  // Editable handlers
  const handleNameSave = async () => {
    if (!nameValue.trim() || !onNameSave) return;
    setSaving(true);
    try {
      await onNameSave(nameValue.trim());
      setIsEditingName(false);
    } catch {
      // Parent handles error messaging
    } finally {
      setSaving(false);
    }
  };

  const handleCountrySave = async () => {
    if (!countryValue || !onCountrySave) return;
    setSaving(true);
    try {
      await onCountrySave(countryValue);
      setIsEditingCountry(false);
    } catch {
      // Parent handles error messaging
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload size mapping
  const uploadSize = avatarUploadSizeMap[size];

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
      {editable && onAvatarChange && uploadSize ? (
        <AvatarUpload
          currentAvatarUrl={user.avatarUrl}
          onUploadComplete={onAvatarChange}
          sizeClass={uploadSize.container}
          initialsSizeClass={uploadSize.initials}
        />
      ) : (
        <Avatar src={user.avatarUrl} name={user.name} size={size} />
      )}

      {/* User info */}
      <div
        className={cn(
          'flex',
          layout === 'vertical' ? 'flex-col items-center gap-1' : 'flex-col gap-0.5',
          compact && layout === 'horizontal' && 'gap-0'
        )}
      >
        {/* Name row */}
        <div
          className={cn(
            'flex items-center',
            layout === 'vertical' ? 'justify-center' : '',
            compact ? 'gap-1' : 'gap-1.5'
          )}
        >
          {editable && isEditingName ? (
            <div className="inline-flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className={cn(
                  'font-semibold text-polar-night bg-transparent border-b-2 border-frost-ice focus:outline-none w-full max-w-xs',
                  textStyle.name
                )}
                autoFocus
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setNameValue(user.name);
                  }
                  if (e.key === 'Enter') handleNameSave();
                }}
              />
              <button
                type="button"
                onClick={handleNameSave}
                disabled={saving}
                className="p-1 text-aurora-green hover:bg-aurora-green/10 rounded transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setIsEditingName(false); setNameValue(user.name); }}
                disabled={saving}
                className="p-1 text-aurora-red hover:bg-aurora-red/10 rounded transition-colors disabled:opacity-50"
              >
                <Close className="w-4 h-4" />
              </button>
            </div>
          ) : editable ? (
            <button
              type="button"
              className="group inline-flex items-center gap-2"
              onClick={() => { setNameValue(user.name); setIsEditingName(true); }}
            >
              <span className={nameClassName}>{user.name}</span>
              <Pencil className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : linkToProfile ? (
            <Link href={profileUrl} className={nameClassName}>
              {user.name}
            </Link>
          ) : (
            <span className={nameClassName}>
              {user.name}
            </span>
          )}

          {/* Country — inline in non-edit mode */}
          {/* In editable mode, only show country when onCountrySave is provided */}
          {(!editable || !!onCountrySave) && !(editable && isEditingCountry) && (
            editable ? (
              <button
                type="button"
                onClick={() => { setCountryValue(user.country as CountryCode || ''); setIsEditingCountry(true); }}
                className="group inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <CountryDisplay countryCode={user.country} mode={countryDisplay} />
                {!user.country && (
                  <span className="text-xs text-frost-ice">+</span>
                )}
              </button>
            ) : (
              <CountryDisplay countryCode={user.country} mode={countryDisplay} />
            )
          )}
        </div>

        {/* Country editor — below name row when editing */}
        {editable && isEditingCountry && onCountrySave && (
          <div className="flex items-center gap-2 mt-1">
            <CountrySelector
              value={countryValue}
              onChange={(c) => setCountryValue(c)}
              disabled={saving}
              required
            />
            <button
              type="button"
              onClick={handleCountrySave}
              disabled={saving}
              className="p-1.5 text-aurora-green hover:bg-aurora-green/10 rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-aurora-green border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setIsEditingCountry(false); setCountryValue(user.country as CountryCode || ''); }}
              disabled={saving}
              className="p-1.5 text-aurora-red hover:bg-aurora-red/10 rounded-md transition-colors disabled:opacity-50"
            >
              <Close className="w-4 h-4" />
            </button>
          </div>
        )}

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
          <span className={cn('text-text-muted', textStyle.meta)}>
            {t('memberSince', {
              date: new Date(memberSince).toLocaleDateString(locale, {
                month: 'short',
                year: 'numeric',
              }),
            })}
          </span>
        )}
      </div>
    </div>
  );
}
