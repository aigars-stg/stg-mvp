'use client';

import { Card, Button, Badge } from '@second-turn/design-system';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Trophy, Star, CheckCircle } from '@/lib/icons';
import { DieToken } from './DieToken';

interface CelebrationScreenProps {
  gameName: string;
  price: string;
  condition: string;
  listingId: string;
  isFirstListing: boolean;
  listingCount: number;
  locale: string;
  onListAnother: () => void;
}

/**
 * CelebrationScreen — shown after a user successfully publishes a listing.
 *
 * For users with fewer than 5 listings, shows a full-viewport celebration with
 * animated die symbol, achievement badge, and listing summary.
 * For experienced sellers (5+ listings), shows a compact success card instead.
 */
export function CelebrationScreen({
  gameName,
  price,
  condition,
  listingId,
  isFirstListing,
  listingCount,
  locale,
  onListAnother,
}: CelebrationScreenProps) {
  const t = useTranslations('Phases');
  const reducedMotion = useReducedMotion();

  const showFullCelebration = listingCount < 5;

  // Compact quick-publish card for experienced sellers (5+ listings)
  if (!showFullCelebration) {
    return (
      <div aria-live="polite" className="max-w-lg mx-auto px-4 py-8">
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-aurora-green">
              <CheckCircle size={32} weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-polar-night mb-1">
                {t('celebrations.listingPublished')}
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                {t('celebrations.listingDetail', { gameName, price: `€${price}` })}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="primary" size="md" onClick={onListAnother}>
                  {t('celebrations.listAnother')}
                </Button>
                <Link href={`/listings/${listingId}`} locale={locale}>
                  <Button variant="secondary" size="md" fullWidth>
                    {t('celebrations.viewListing')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Full celebration for newer sellers (< 5 listings)
  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
    >
      <div className="max-w-md w-full mx-auto px-6 text-center">
        {/* Die symbol — 72px with celebrate-bounce entrance */}
        <div
          className={`flex justify-center mb-8 ${
            reducedMotion ? '' : 'animate-celebrate-bounce'
          }`}
        >
          <DieToken size={72} />
        </div>

        {/* Headline and subtext */}
        <div className={reducedMotion ? '' : 'animate-fade-in'}>
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
            {t('celebrations.listingPublished')}
          </h1>
          <p className="text-base text-text-secondary mb-6">
            {t('celebrations.listingPublishedSubtext')}
          </p>
        </div>

        {/* First Turn achievement badge */}
        {isFirstListing && (
          <div
            className={`flex justify-center mb-6 ${
              reducedMotion ? '' : 'animate-fade-in'
            }`}
          >
            <Badge variant="default" size="md">
              <span className="inline-flex items-center gap-1.5 px-1 py-0.5 text-frost-arctic">
                <Trophy size={16} weight="fill" />
                <span>{t('achievements.firstTurn.toast')}</span>
              </span>
            </Badge>
          </div>
        )}

        {/* Listing summary card */}
        <div className={`mb-8 ${reducedMotion ? '' : 'animate-fade-in'}`}>
          <Card padding="md" className="text-left">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-polar-night text-base truncate pr-3">
                  {gameName}
                </h3>
                <span className="text-lg font-bold text-polar-night whitespace-nowrap">
                  €{price}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={14} className="text-aurora-orange" weight="fill" />
                <span className="text-sm text-text-secondary">{condition}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* CTAs */}
        <div
          className={`flex flex-col gap-3 ${
            reducedMotion ? '' : 'animate-fade-in'
          }`}
        >
          <Button variant="primary" size="lg" fullWidth onClick={onListAnother}>
            {t('celebrations.listAnother')}
          </Button>
          <Link href={`/listings/${listingId}`} locale={locale}>
            <Button variant="secondary" size="lg" fullWidth>
              {t('celebrations.viewListing')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
