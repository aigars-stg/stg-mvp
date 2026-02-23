'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Package, Check } from '@/lib/icons';
import { UserInfoCard } from '@/components/user/UserInfoCard';
import { formatPrice } from '@/lib/services/pricing';
import type { WantedFormData } from '@/lib/hooks/useWantedListingForm';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/auth/types';

interface WantedPreviewSidebarProps {
  formData: WantedFormData;
  user: User | null;
  profile: UserProfile | null;
}

export function WantedPreviewSidebar({
  formData,
  user,
  profile,
}: WantedPreviewSidebarProps) {
  const t = useTranslations('Wanted.CreatePage.preview');

  const displayImage =
    formData.selectedVersion?.image ||
    formData.selectedGame?.image ||
    formData.selectedGame?.thumbnail ||
    null;

  const gameName =
    formData.selectedGameDisplayName || formData.selectedGame?.name;

  const price = formData.maxPrice ? parseFloat(formData.maxPrice) : null;
  const hasValidPrice = price !== null && price > 0 && !isNaN(price);

  const hasGame = !!formData.selectedGame;
  const isComplete = hasGame && !!formData.selectedVersion && hasValidPrice;

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-aurora-orange">
          {t('title')}
        </h3>
      </div>

      {!hasGame ? (
        /* Empty state */
        <div className="p-8 text-center">
          <Package className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">{t('selectGame')}</p>
        </div>
      ) : (
        <>
          {/* Game Image */}
          <div className="relative w-full aspect-[4/3] bg-bg-secondary">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={gameName || 'Game preview'}
                fill
                className="object-contain p-2"
                sizes="(min-width: 1024px) 33vw, 100vw"
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-12 h-12 text-text-muted" />
              </div>
            )}
            {/* WANTED badge overlay */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-aurora-orange rounded text-xs text-snow-white font-bold uppercase tracking-wide">
              {t('wantedBadge')}
            </div>
          </div>

          {/* Game Info */}
          <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              {t('sections.game')}
            </p>
            <p className="text-sm font-semibold text-polar-night leading-tight">
              {gameName}
              {formData.selectedVersion?.yearPublished && (
                <span className="text-text-muted font-normal">
                  {' '}({formData.selectedVersion.yearPublished})
                </span>
              )}
            </p>
            {formData.selectedVersion && (
              <div className="mt-1 text-xs text-text-secondary space-y-0.5">
                {formData.selectedVersion.language && (
                  <p>{formData.selectedVersion.languages?.join(', ') || formData.selectedVersion.language}</p>
                )}
                {formData.selectedVersion.publisher && (
                  <p>{formData.selectedVersion.publishers?.join(', ') || formData.selectedVersion.publisher}</p>
                )}
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              {t('sections.budget')}
            </p>
            {hasValidPrice ? (
              <p className="text-2xl font-bold text-aurora-orange">
                {t('budgetDisplay', { price: formatPrice(price!) })}
              </p>
            ) : (
              <p className="text-sm text-text-muted italic">&mdash;</p>
            )}
          </div>

          {/* Notes */}
          {formData.notes && (
            <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                {t('sections.notes')}
              </p>
              <p className="text-sm text-text-secondary line-clamp-3">
                {formData.notes}
              </p>
            </div>
          )}

          {/* Buyer */}
          {user && profile && (
            <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                {t('sections.buyer')}
              </p>
              <UserInfoCard
                user={{
                  id: user.id,
                  name: profile.full_name || 'You',
                  avatarUrl: profile.avatar_url,
                  country: profile.country,
                }}
                size="sm"
                linkToProfile={false}
              />
            </div>
          )}

          {/* Ready indicator */}
          {isComplete && (
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="w-5 h-5 rounded-full bg-aurora-green/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-aurora-green" />
              </div>
              <span className="text-sm font-medium text-aurora-green">
                {t('readyToPost')}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
