'use client';

import { useRouter } from '@/i18n/navigation';
import { Button, Card } from '@second-turn/design-system';
import { Package } from '@/lib/icons';
import { useTranslations } from 'next-intl';

/**
 * Seller CTA card - Navigation hub for seller onboarding.
 *
 * Shows CTA for non-active sellers → routes to /seller/onboard.
 * Hidden when active (handled by parent).
 *
 * All seller onboarding logic (terms, country selection) lives in /seller/onboard.
 */
export function SellerCTACard() {
  const t = useTranslations('Dashboard.SellerCTA');
  const router = useRouter();

  const handleStartSelling = () => {
    router.push('/seller/onboard');
  };

  return (
    <Card padding="lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
          <Package className="w-6 h-6 text-frost-ice" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {t('title')}
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            {t('subtitle')}
          </p>
          <Button variant="primary" size="lg" onClick={handleStartSelling}>
            {t('startSelling')}
          </Button>
        </div>
      </div>
    </Card>
  );
}