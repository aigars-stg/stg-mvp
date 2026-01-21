'use client';

import { Badge } from '@second-turn/design-system';
import {
  CheckCircleAlt01 as CheckCircle2,
  AlertCircle,
  FileText,
} from 'griddy-icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DAC7_THRESHOLDS,
  getDac7StatusLabel,
  type Dac7ComplianceStatus,
} from '@/lib/types/seller';

interface Dac7StatusCardProps {
  complianceStatus: Dac7ComplianceStatus;
  annualTransactionCount: number;
  annualSalesTotal: number;
  hasSubmittedTaxInfo: boolean;
}

/**
 * Compact status card showing DAC7 compliance progress
 * Can be used in seller dashboard or settings
 */
export function Dac7StatusCard({
  complianceStatus,
  annualTransactionCount,
  annualSalesTotal,
  hasSubmittedTaxInfo,
}: Dac7StatusCardProps) {
  const t = useTranslations('SellerDashboard.Dac7');

  const transactionPercent = Math.min(
    100,
    (annualTransactionCount / DAC7_THRESHOLDS.TRANSACTION_COUNT) * 100
  );
  const salesPercent = Math.min(
    100,
    (annualSalesTotal / DAC7_THRESHOLDS.SALES_TOTAL) * 100
  );

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-aurora-red';
    if (percent >= 80) return 'bg-aurora-yellow';
    return 'bg-frost-ice';
  };

  return (
    <Link href="/seller/tax-info" className="block">
      <div className="bg-snow-white border-2 border-border rounded-xl p-6 hover:border-frost-ice/50 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-frost-ice" />
            </div>
            <div>
              <h3 className="font-semibold text-polar-night">{t('cardTitle')}</h3>
              <p className="text-sm text-text-muted">{t('cardSubtitle')}</p>
            </div>
          </div>
          <Badge
            variant={
              complianceStatus === 'compliant'
                ? 'success'
                : complianceStatus === 'exempt'
                  ? 'default'
                  : complianceStatus === 'blocked'
                    ? 'error'
                    : 'warning'
            }
          >
            {complianceStatus === 'compliant' && (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            )}
            {(complianceStatus === 'approaching' ||
              complianceStatus === 'required' ||
              complianceStatus === 'blocked') && (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {getDac7StatusLabel(complianceStatus)}
          </Badge>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">{t('transactions')}</span>
              <span className="text-text-secondary">
                {annualTransactionCount}/{DAC7_THRESHOLDS.TRANSACTION_COUNT}
              </span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor(transactionPercent)}`}
                style={{ width: `${transactionPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">{t('sales')}</span>
              <span className="text-text-secondary">
                €{annualSalesTotal.toFixed(0)}/€{DAC7_THRESHOLDS.SALES_TOTAL}
              </span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor(salesPercent)}`}
                style={{ width: `${salesPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status message */}
        <p className="text-xs text-text-muted mt-3">
          {hasSubmittedTaxInfo
            ? t('taxInfoSubmitted')
            : complianceStatus === 'exempt'
              ? t('noActionRequired')
              : t('clickToProvide')}
        </p>
      </div>
    </Link>
  );
}
