'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import { AlertTriangle, LinkExternal as ExternalLink, RefreshCw as Loader2 } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface StripeStatus {
  hasAccount: boolean;
  requiresAction: boolean;
  currentlyDue: string[];
  pastDue: string[];
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

/**
 * Warning banner shown on seller dashboard when Stripe needs additional information
 * (e.g., identity verification, address confirmation)
 */
export function StripeRequirementsBanner() {
  const t = useTranslations('SellerDashboard.StripeRequirements');
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/seller/stripe-status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Error fetching Stripe status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  const handleOpenDashboard = async () => {
    try {
      setOpeningDashboard(true);
      const response = await fetch('/api/seller/connect/dashboard', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.dashboardUrl) {
          window.open(data.dashboardUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
    } finally {
      setOpeningDashboard(false);
    }
  };

  // Don't show while loading
  if (loading) {
    return null;
  }

  // Don't show if no account or no action required
  if (!status?.hasAccount || !status.requiresAction) {
    return null;
  }

  const hasPastDue = status.pastDue.length > 0;
  const requirementCount = status.currentlyDue.length + status.pastDue.length;

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 mb-6 ${
        hasPastDue
          ? 'bg-aurora-red/10 border-2 border-aurora-red/30'
          : 'bg-aurora-yellow/10 border-2 border-aurora-yellow/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            hasPastDue ? 'bg-aurora-red/20' : 'bg-aurora-yellow/20'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 ${
              hasPastDue ? 'text-aurora-red' : 'text-aurora-yellow'
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-grow">
          <h3
            className={`font-semibold mb-1 ${
              hasPastDue ? 'text-aurora-red' : 'text-aurora-yellow'
            }`}
          >
            {hasPastDue ? t('overdue.title') : t('actionNeeded.title')}
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            {hasPastDue
              ? t('overdue.description')
              : t('actionNeeded.description', { count: requirementCount })}
          </p>

          {/* Action button */}
          <Button
            variant={hasPastDue ? 'danger' : 'accent'}
            size="sm"
            onClick={handleOpenDashboard}
            disabled={openingDashboard}
          >
            {openingDashboard ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('opening')}
              </>
            ) : (
              <>
                {t('completeInStripe')}
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
