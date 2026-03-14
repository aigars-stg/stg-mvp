'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@second-turn/design-system';
import { ArrowLeft } from '@/lib/icons';
import { getStatusConfig } from '@/components/shipping';

interface OrderDetailHeaderProps {
  orderNumber: string;
  status: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  /** Extra content rendered after the status badge (e.g. "Open Issues" badge) */
  extraBadges?: React.ReactNode;
}

export function OrderDetailHeader({
  orderNumber,
  status,
  subtitle,
  backHref,
  backLabel,
  extraBadges,
}: OrderDetailHeaderProps) {
  const tOrders = useTranslations('Orders');
  const statusInfo = getStatusConfig(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-frost-ice/5 border-b border-frost-ice/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-frost-ice mb-3 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
            {orderNumber}
          </h1>
          <Badge variant={statusInfo.variant} size="sm">
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.labelKey ? tOrders(statusInfo.labelKey as any) : statusInfo.label}
          </Badge>
          {extraBadges}
        </div>
        <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
