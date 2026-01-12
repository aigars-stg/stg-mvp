'use client';

import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { Package } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface SellerCTACardProps {
  sellerStatus: string;
}

/**
 * Seller CTA card - Navigation hub for seller onboarding.
 *
 * Shows different states:
 * - not_started: CTA button → routes to /seller/onboard
 * - onboarding: Continue button → routes to /seller/onboard
 * - active: Hidden (handled by parent)
 *
 * All seller onboarding logic (terms, country selection) lives in /seller/onboard.
 */
export function SellerCTACard({ sellerStatus }: SellerCTACardProps) {
  const t = useTranslations('Dashboard.SellerCTA');
  const router = useRouter();

  const handleStartSelling = () => {
    router.push('/seller/onboard');
  };

  // If onboarding in progress, show continue button
  if (sellerStatus === 'onboarding') {
    return (
      <Card padding="lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
            <Package className="w-6 h-6 text-frost-ice" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-polar-night mb-2">
              {t('continueSetup.title')}
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              {t('continueSetup.subtitle')}
            </p>
            <div className="flex items-center gap-2 text-sm text-aurora-orange mb-4">
              <div className="w-2 h-2 bg-aurora-orange rounded-full animate-pulse" />
              {t('continueSetup.stepProgress')}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartSelling}
            >
              {t('continueSetup.button')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Default: not_started state
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