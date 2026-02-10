'use client';

import { Button } from '@second-turn/design-system';
import { AlertTriangle, FileText, ArrowRight } from 'griddy-icons';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { Dac7ComplianceStatus } from '@/lib/types/seller';

interface Dac7WarningBannerProps {
  complianceStatus: Dac7ComplianceStatus;
  annualTransactionCount: number;
  annualSalesTotal: number;
}

/**
 * Warning banner shown on seller dashboard when DAC7 tax information is needed
 */
export function Dac7WarningBanner({
  complianceStatus,
  annualTransactionCount,
  annualSalesTotal,
}: Dac7WarningBannerProps) {
  const t = useTranslations('SellerDashboard.Dac7');

  // Don't show for exempt or compliant sellers
  if (complianceStatus === 'exempt' || complianceStatus === 'compliant') {
    return null;
  }

  const isBlocked = complianceStatus === 'blocked';
  const isRequired = complianceStatus === 'required';

  // Determine which threshold is closest
  const transactionPercent = (annualTransactionCount / 30) * 100;
  const salesPercent = (annualSalesTotal / 2000) * 100;
  const highestPercent = Math.max(transactionPercent, salesPercent);

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 mb-6 ${
        isBlocked
          ? 'bg-aurora-red/10 border-2 border-aurora-red/30'
          : isRequired
            ? 'bg-aurora-yellow/10 border-2 border-aurora-yellow/30'
            : 'bg-frost-ice/10 border-2 border-frost-ice/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isBlocked
              ? 'bg-aurora-red/20'
              : isRequired
                ? 'bg-aurora-yellow/20'
                : 'bg-frost-ice/20'
          }`}
        >
          {isBlocked ? (
            <AlertTriangle
              className={`w-5 h-5 ${
                isBlocked ? 'text-aurora-red' : 'text-aurora-yellow'
              }`}
            />
          ) : (
            <FileText className="w-5 h-5 text-frost-ice" />
          )}
        </div>

        {/* Content */}
        <div className="flex-grow">
          <h3
            className={`font-semibold mb-1 ${
              isBlocked
                ? 'text-aurora-red'
                : isRequired
                  ? 'text-aurora-yellow'
                  : 'text-frost-ice'
            }`}
          >
            {isBlocked
              ? t('blocked.title')
              : isRequired
                ? t('required.title')
                : t('approaching.title')}
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            {isBlocked
              ? t('blocked.description')
              : isRequired
                ? t('required.description')
                : t('approaching.description', {
                    percent: Math.round(highestPercent),
                  })}
          </p>

          {/* Progress indicators */}
          <div className="flex flex-wrap gap-4 text-xs text-text-muted mb-4">
            <span>
              {t('transactions')}: {annualTransactionCount}/30
            </span>
            <span>
              {t('sales')}: €{annualSalesTotal.toFixed(0)}/€2,000
            </span>
          </div>

          {/* Action button */}
          <Link href="/seller/tax-info">
            <Button
              variant={isBlocked ? 'danger' : 'accent'}
              size="sm"
            >
              {t('provideTaxInfo')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
