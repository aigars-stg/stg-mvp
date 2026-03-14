'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import {
  Truck,
  LinkExternal as ExternalLink,
} from '@/lib/icons';

interface SellerReadyToShipProps {
  unisendParcelId: number | null | undefined;
  labelUrl: string | null | undefined;
  barcode: string | null | undefined;
  trackingUrl: string | null | undefined;
}

export function SellerReadyToShip({
  unisendParcelId,
  labelUrl,
  barcode,
  trackingUrl,
}: SellerReadyToShipProps) {
  const t = useTranslations('SellerOrderDetail');

  return (
    <div className="bg-frost-ice/10 border-2 border-frost-ice/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
          <Truck className="w-6 h-6 text-frost-ice" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-polar-night mb-1">
            {t('readyToShip.title')}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {t('readyToShip.description')}
          </p>

          <div className="mb-4 p-4 bg-snow-white rounded-lg border-2 border-frost-ice">
            <p className="text-xs text-text-secondary mb-1">{t('readyToShip.parcelId')}</p>
            <p className="font-mono text-2xl font-bold text-frost-ice">
              {unisendParcelId || labelUrl?.replace('unisend://terminal/', '') || barcode}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">
                  {step}
                </div>
                <p className="text-sm text-text-secondary">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(t as any).rich(`readyToShip.step${step}`, {
                    strong: (chunks: React.ReactNode) => <strong className="text-polar-night">{chunks}</strong>,
                  })}
                </p>
              </div>
            ))}
          </div>

          {barcode && trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('readyToShip.trackPackage')}
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
