'use client';

import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import { Search, Chat as MessageSquare, Shield, Truck } from 'griddy-icons';
import { useTranslations } from 'next-intl';

/**
 * Platform features card - Educational content about how the marketplace works.
 *
 * Brand Voice:
 * - Title: "How it works"
 * - Clear, friendly explanations of key features
 */
export function PlatformFeaturesCard() {
  const t = useTranslations('Dashboard.PlatformFeatures');

  const featureKeys = [
    { icon: Search, key: 'browse' },
    { icon: MessageSquare, key: 'negotiate' },
    { icon: Shield, key: 'secure' },
    { icon: Truck, key: 'shipping' },
  ] as const;

  return (
    <Card padding="lg" className="bg-frost-ice/5 border-frost-ice/20">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-polar-night mb-2">
          {t('title')}
        </h2>
        <p className="text-sm text-text-secondary">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {featureKeys.map((feature, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-snow-white rounded-lg"
          >
            <div className="p-2 bg-frost-ice/10 rounded-lg flex-shrink-0">
              <feature.icon className="w-4 h-4 text-frost-ice" />
            </div>
            <p className="text-sm text-text-secondary">{t(`features.${feature.key}`)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/browse">
          <Button variant="primary" size="md">
            {t('browseGames')}
          </Button>
        </Link>
        <Link href="/how-it-works">
          <Button variant="secondary" size="md">
            {t('learnMore')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
