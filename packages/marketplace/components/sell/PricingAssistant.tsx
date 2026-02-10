'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@second-turn/design-system';
import { TrendUp as TrendingUp, LinkExternal as ExternalLink, RefreshCw as Loader2, AlertCircle, Tag, ChartBar as BarChart3, PuzzlePiece as Puzzle, InfoCircle as Info } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';

interface ExpansionPricing {
  bggGameId: number;
  gameName: string | null;
  lowestPrice: number | null;
}

interface PricingData {
  bggGameId: number;
  gameName: string | null;
  external: {
    lowestPrice: number | null;
    shopName: string | null;
    url: string | null;
    offerCount: number;
    cachedAt: string;
    attribution: {
      text: string;
      url: string;
    };
  } | null;
  internal: {
    lowestActivePrice: number | null;
    lowestIsAuction?: boolean;
    activeListingCount: number;
    medianSoldPrice: number | null;
    avgSoldPrice: number | null;
    completedSalesCount: number;
  } | null;
  expansions?: ExpansionPricing[];
}

interface PricingAssistantProps {
  bggGameId: number;
  condition?: string | null;
  onFillPrice: (price: number) => void;
  expansionIds?: number[];
  pricingFormat?: 'fixed_price' | 'auction';
}

/**
 * PricingAssistant - Helps sellers set competitive prices
 *
 * Displays:
 * - New retail price from BoardGamePrices.co.uk (external anchor)
 * - Average sold price from marketplace history (internal data)
 * - Suggested price based on condition
 *
 * ToS Compliance:
 * - Always shows attribution link to BoardGamePrices.co.uk
 * - Uses their redirect URLs for price verification
 */
export function PricingAssistant({
  bggGameId,
  condition,
  onFillPrice,
  expansionIds = [],
  pricingFormat = 'fixed_price',
}: PricingAssistantProps) {
  const t = useTranslations('Sell.PricingAssistant');
  const tConditions = useTranslations('Sell.PricingAssistant.conditions');
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable key for expansion IDs to avoid unnecessary re-fetches
  // Use numeric sort to ensure consistent key regardless of add order
  const expansionKey = expansionIds.slice(0, 10).sort((a, b) => a - b).join(',');

  useEffect(() => {
    if (!bggGameId) return;

    const fetchPricing = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build URL with optional expansion IDs (capped at 10)
        let url = `/api/games/${bggGameId}/pricing`;
        if (expansionIds.length > 0) {
          const idsToFetch = expansionIds.slice(0, 10);
          url += `?expansions=${idsToFetch.join(',')}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch pricing data');
        }

        const data = await response.json();
        setPricingData(data);
      } catch (err: unknown) {
        console.error('[PricingAssistant] Fetch error:', err);
        setError('Unable to load pricing suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bggGameId, expansionKey]); // expansionKey derived from expansionIds, triggers re-fetch when expansions change

  // Calculate suggested price based on condition (includes expansions)
  // For auctions, suggest ~50% of the fixed price as starting bid
  const getSuggestedPrice = (): number | null => {
    if (!pricingData) return null;

    const { external, internal, expansions } = pricingData;

    // Base game price: priority is median sold > external lowest > lowest active listing
    const baseGamePrice =
      internal?.medianSoldPrice ||
      external?.lowestPrice ||
      internal?.lowestActivePrice ||
      0;

    // Sum expansion prices (only those that have pricing data)
    const expansionTotal = expansions?.reduce(
      (sum, exp) => sum + (exp.lowestPrice || 0),
      0
    ) || 0;

    const totalRetailValue = baseGamePrice + expansionTotal;

    if (totalRetailValue === 0) return null;

    // Apply condition discount from new retail
    const conditionMultipliers: Record<string, number> = {
      likeNew: 0.85, // 15% off new retail
      veryGood: 0.75, // 25% off
      good: 0.65, // 35% off
      acceptable: 0.5, // 50% off
    };

    const multiplier = condition ? conditionMultipliers[condition] || 0.7 : 0.7;
    let suggestedPrice = Math.round(totalRetailValue * multiplier * 100) / 100;

    // For auctions, suggest ~50% of the fixed price as a starting bid
    // This encourages bidding activity
    if (pricingFormat === 'auction') {
      suggestedPrice = Math.round(suggestedPrice * 0.5 * 100) / 100;
      // Ensure minimum of €1 for auctions
      suggestedPrice = Math.max(suggestedPrice, 1);
    }

    return suggestedPrice;
  };

  // Get bundle info for display
  const getBundleInfo = () => {
    const totalExpansions = expansionIds.length;
    if (totalExpansions === 0) return null;

    const pricedExpansions = pricingData?.expansions?.filter(e => e.lowestPrice !== null).length || 0;
    const expansionTotal = pricingData?.expansions?.reduce(
      (sum, exp) => sum + (exp.lowestPrice || 0),
      0
    ) || 0;

    return {
      totalExpansions,
      pricedExpansions,
      expansionTotal,
    };
  };

  const formatCondition = (cond: string): string => {
    const conditionKeys: Record<string, string> = {
      likeNew: 'likeNew',
      veryGood: 'veryGood',
      good: 'good',
      acceptable: 'acceptable',
    };
    const key = conditionKeys[cond] as keyof typeof conditionKeys | undefined;
    return key ? tConditions(key) : cond;
  };

  if (!bggGameId) {
    return null;
  }

  if (loading) {
    return (
      <Card padding="md" className="bg-frost-ice/5 border-frost-ice/20 mb-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" className="bg-aurora-yellow/5 border border-aurora-yellow/20 mb-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <AlertCircle className="w-4 h-4 text-aurora-yellow" />
          <span className="text-sm">{t('error')}</span>
        </div>
      </Card>
    );
  }

  if (!pricingData) return null;

  const { external, internal } = pricingData;
  const suggestedPrice = getSuggestedPrice();
  const bundleInfo = getBundleInfo();

  // Calculate total bundle retail value for display
  const baseGameRetail = external?.lowestPrice || 0;
  const bundleRetailValue = baseGameRetail + (bundleInfo?.expansionTotal || 0);

  // If no pricing data available at all, don't show the component
  if (!external?.lowestPrice && !internal?.medianSoldPrice && !internal?.lowestActivePrice) {
    return null;
  }

  return (
    <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-frost-ice" />
        <h4 className="font-semibold text-polar-night text-sm">{t('title')}</h4>
      </div>

      <div className="space-y-3">
        {/* External Retail Price - Stacked breakdown for bundles */}
        {external?.lowestPrice && (
          <div className="space-y-2">
            {/* Single game - simple row (also used when no expansion prices available) */}
            {(!bundleInfo || bundleInfo.expansionTotal === 0) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">{t('newRetail')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-polar-night tabular-nums">
                    {formatPrice(external.lowestPrice)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onFillPrice(external.lowestPrice!)}
                    className="text-xs px-3 h-7"
                  >
                    {t('fillButton')}
                  </Button>
                </div>
              </div>
            )}

            {/* Bundle breakdown - only when we have expansion pricing data */}
            {bundleInfo && bundleInfo.expansionTotal > 0 && (
              <>
                {/* Base game line */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-text-secondary" />
                    <span className="text-text-secondary">{t('baseGame')}</span>
                  </div>
                  <span className="text-text-secondary tabular-nums">
                    {formatPrice(external.lowestPrice)}
                  </span>
                </div>

                {/* Expansions line */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Puzzle className="w-4 h-4 text-frost-ice" />
                    <span className="text-text-secondary">
                      + {t('expansions', { count: bundleInfo.totalExpansions })}
                      {bundleInfo.pricedExpansions < bundleInfo.totalExpansions && (
                        <span className="text-text-muted"> ({t('pricedCount', { count: bundleInfo.pricedExpansions })})</span>
                      )}
                      :
                    </span>
                  </div>
                  <span className="text-text-secondary tabular-nums">
                    {formatPrice(bundleInfo.expansionTotal)}
                  </span>
                </div>

                {/* Bundle total with divider */}
                <div className="border-t border-frost-ice/20 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-polar-night">{t('bundleRetail')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-polar-night tabular-nums">
                      {formatPrice(bundleRetailValue)}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onFillPrice(bundleRetailValue)}
                      className="text-xs px-3 h-7"
                    >
                      {t('fillButton')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Second Turn Marketplace Data - visual separation from external */}
        {(internal?.medianSoldPrice || internal?.lowestActivePrice) && external?.lowestPrice && (
          <div className="border-t border-border/50 pt-3 mt-1" />
        )}

        {/* Internal Median Sold Price */}
        {internal?.medianSoldPrice && internal.completedSalesCount >= 3 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">{t('avgSoldHere')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-polar-night tabular-nums">
                {formatPrice(internal.medianSoldPrice)}
              </span>
              <span className="text-xs text-text-muted">
                ({t('salesCount', { count: internal.completedSalesCount })})
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onFillPrice(internal.medianSoldPrice!)}
                className="text-xs px-3 h-7"
              >
                {t('fillButton')}
              </Button>
            </div>
          </div>
        )}

        {/* Current Competition on Second Turn */}
        {internal?.lowestActivePrice && internal.activeListingCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              {t('lowestOnSecondTurn')}
            </span>
            <span className="text-text-secondary tabular-nums">
              {formatPrice(internal.lowestActivePrice)}
              {internal.lowestIsAuction && (
                <span className="text-text-muted ml-1">{t('lowestIsAuction')}</span>
              )}
            </span>
          </div>
        )}

        {/* Suggested Price */}
        {suggestedPrice && condition && (
          <div className="pt-3 mt-3 border-t border-frost-ice/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-frost-ice">
                {pricingFormat === 'auction'
                  ? t('suggestedStartingBid')
                  : t('suggestedFor', { condition: formatCondition(condition) })}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-frost-ice text-lg tabular-nums">
                  {formatPrice(suggestedPrice)}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onFillPrice(suggestedPrice)}
                  className="h-8 px-4"
                >
                  {t('usePrice')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Attribution */}
        {external?.attribution && (
          <div className="pt-3 mt-3 border-t border-frost-ice/10 flex items-center justify-between">
            <a
              href={external.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-frost-ice flex items-center gap-1 transition-colors"
            >
              {external.attribution.text}
              <ExternalLink className="w-3 h-3" />
            </a>
            <span
              className="text-text-muted cursor-help"
              title={t('disclaimer')}
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
