'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import {
  Star,
  CheckCircleAlt01 as CheckCircle,
} from '@/lib/icons';

interface BuyerReviewCTAProps {
  orderId: string;
  hasReview: boolean | null;
}

export function BuyerReviewCTA({ orderId, hasReview }: BuyerReviewCTAProps) {
  const t = useTranslations('Orders.detail');

  if (hasReview === null) return null;

  return (
    <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
      {hasReview === false ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-polar-night">
                {t('review.title')}
              </h3>
              <p className="text-sm text-text-secondary">
                {t('review.description')}
              </p>
            </div>
          </div>
          <Link href={`/orders/${orderId}/review`}>
            <Button variant="accent" size="sm">
              {t('review.button')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-text-secondary">
          <CheckCircle className="w-5 h-5 text-aurora-green flex-shrink-0" />
          <span className="text-sm">{t('review.alreadyReviewed')}</span>
        </div>
      )}
    </div>
  );
}
