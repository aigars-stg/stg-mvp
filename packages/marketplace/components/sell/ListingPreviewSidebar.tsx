'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Badge } from '@second-turn/design-system';
import { CreditCard, Package } from '@/lib/icons';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { UserInfoCard } from '@/components/user/UserInfoCard';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { formatPrice } from '@/lib/services/pricing';
import type { ListingFormData } from '@/lib/hooks/useListingForm';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/auth/types';

interface PreviewProfile extends UserProfile {
  total_completed_sales?: number;
  average_rating?: number;
  total_reviews?: number;
}

interface ListingPreviewSidebarProps {
  formData: ListingFormData;
  user: User | null;
  profile: PreviewProfile | null;
  existingPhotoUrls: string[];
}

export function ListingPreviewSidebar({
  formData,
  user,
  profile,
  existingPhotoUrls,
}: ListingPreviewSidebarProps) {
  const t = useTranslations('Sell.preview');
  const tCondition = useTranslations('Sell.ConditionSelector.condition');

  // Build photo URLs: existing + new blob previews
  const allPhotoUrls = [
    ...existingPhotoUrls,
    ...formData.photos.map((p) => p.preview),
  ];

  // Resolve display image: photos first, then version image, then game image
  const displayImage =
    allPhotoUrls[0] ||
    formData.selectedVersion?.image ||
    formData.selectedGame?.image ||
    null;

  const gameName =
    formData.selectedGameDisplayName || formData.selectedGame?.name;

  const price = formData.price ? parseFloat(formData.price) : null;
  const hasValidPrice = price !== null && price > 0 && !isNaN(price);

  const conditionLabels: Record<string, string> = {
    likeNew: tCondition('likeNew'),
    veryGood: tCondition('veryGood'),
    good: tCondition('good'),
    acceptable: tCondition('acceptable'),
  };

  const hasGame = !!formData.selectedGame;

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-polar-night">
          {t('title')}
        </h3>
      </div>

      {!hasGame ? (
        // Empty state
        <div className="p-8 text-center">
          <Package className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">{t('selectGame')}</p>
        </div>
      ) : (
        <>
          {/* Photos */}
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
            {/* Photo count badge */}
            {allPhotoUrls.length > 0 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-polar-night/80 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium">
                {t('photoCount', { count: allPhotoUrls.length })}
              </div>
            )}
          </div>

          {/* Photo strip - show thumbnails if multiple photos */}
          {allPhotoUrls.length > 1 && (
            <div className="px-4 sm:px-6 py-2 border-b border-border-subtle">
              <div className="flex gap-1.5 overflow-x-auto">
                {allPhotoUrls.slice(0, 5).map((url, i) => (
                  <ListingThumbnail
                    key={i}
                    src={url}
                    alt={`Photo ${i + 1}`}
                    size="xs"
                  />
                ))}
                {allPhotoUrls.length > 5 && (
                  <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-xs text-text-muted font-medium">
                    +{allPhotoUrls.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game info + condition */}
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
            {/* Version details */}
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
            {/* Condition badge */}
            {formData.condition && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={getConditionBadgeVariant(formData.condition)} size="sm">
                  {conditionLabels[formData.condition]}
                </Badge>
                {!formData.allComponentsPresent && (
                  <span className="text-xs text-aurora-orange">
                    {t('missingComponents')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Expansions */}
          {formData.selectedExpansions.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                {t('sections.expansions')}
              </p>
              <div className="space-y-1.5">
                {formData.selectedExpansions.map((exp) => (
                  <div key={exp.bgg_id} className="flex items-center gap-2">
                    <ListingThumbnail
                      src={exp.thumbnail}
                      alt={exp.displayName}
                      size="xs"
                    />
                    <span className="text-xs text-polar-night truncate">
                      {exp.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing breakdown */}
          <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              {t('sections.pricing')}
            </p>
            {hasValidPrice ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {formData.pricingFormat === 'auction'
                      ? t('pricingBreakdown.startingBid')
                      : t('pricingBreakdown.price')}
                  </span>
                  <span className="font-medium text-polar-night">
                    {formatPrice(price!)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t('pricingBreakdown.fee')}
                  </span>
                  <span className="text-text-secondary">
                    -{formatPrice(price! * SELLER_COMMISSION_RATE)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 mt-1.5 border-t border-border-subtle">
                  <span className="text-sm font-semibold text-polar-night">
                    {t('pricingBreakdown.youReceive')}
                  </span>
                  <span className="text-base font-bold text-aurora-green">
                    {formatPrice(price! * (1 - SELLER_COMMISSION_RATE))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">—</p>
            )}
          </div>

          {/* Sale type */}
          <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              {t('sections.saleType')}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-aurora-green/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-aurora-green" />
              </div>
              <div>
                <p className="text-sm font-medium text-polar-night">
                  {formData.pricingFormat === 'auction' ? t('auction') : t('fixedPrice')}
                </p>
              </div>
            </div>
          </div>

          {/* Seller */}
          {user && profile && (
            <div className="px-4 sm:px-6 py-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                {t('sections.seller')}
              </p>
              <UserInfoCard
                user={{
                  id: user.id,
                  name: profile.full_name || 'You',
                  avatarUrl: profile.avatar_url,
                  country: profile.country,
                }}
                seller={{
                  totalSales: profile.total_completed_sales ?? 0,
                  averageRating: profile.average_rating ?? 0,
                  totalReviews: profile.total_reviews ?? 0,
                }}
                size="sm"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
