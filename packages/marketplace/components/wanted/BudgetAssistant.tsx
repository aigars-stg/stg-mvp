'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@second-turn/design-system';
import { TrendUp as TrendingUp, LinkExternal as ExternalLink, RefreshCw as Loader2, AlertCircle, Tag, ChartBar as BarChart3, InfoCircle as Info } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import type { ListingCondition } from '@/lib/types/listing';

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
    activeListingCount: number;
    medianSoldPrice: number | null;
    avgSoldPrice: number | null;
    completedSalesCount: number;
  } | null;
}

interface BudgetAssistantProps {
  bggGameId: number;
  minimumCondition: ListingCondition | null;
  onFillBudget: (price: number) => void;
}

/**
 * BudgetAssistant - Helps buyers set realistic budgets for wanted listings
 *
 * Displays:
 * - New retail price from BoardGamePrices.co.uk (external anchor)
 * - Median sold price from marketplace history (internal data)
 * - Suggested budget based on minimum acceptable condition
 *
 * The suggestion is calculated based on the condition's typical market value:
 * - Like New: ~85% of retail
 * - Very Good: ~75% of retail
 * - Good: ~65% of retail
 * - Acceptable: ~50% of retail
 */
export function BudgetAssistant({
  bggGameId,
  minimumCondition,
  onFillBudget,
}: BudgetAssistantProps) {
  const t = useTranslations('Wanted.BudgetAssistant');
  const tConditions = useTranslations('Wanted.BudgetAssistant.conditions');
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bggGameId) return;

    const fetchPricing = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/games/${bggGameId}/pricing`);

        if (!response.ok) {
          throw new Error('Failed to fetch pricing data');
        }

        const data = await response.json();
        setPricingData(data);
      } catch (error: unknown) {
        console.error('[BudgetAssistant] Fetch error:', error);
        setError(error instanceof Error ? error.message : 'Unable to load pricing suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [bggGameId]);

  // Calculate suggested budget based on minimum condition
  const getSuggestedBudget = (): number | null => {
    if (!pricingData) return null;

    const { external, internal } = pricingData;

    // Base price: priority is external retail > median sold > lowest active listing
    const basePrice =
      external?.lowestPrice ||
      internal?.medianSoldPrice ||
      internal?.lowestActivePrice ||
      0;

    if (basePrice === 0) return null;

    // Apply condition multiplier for budget suggestion
    // These represent typical market value at each condition level
    const conditionMultipliers: Record<string, number> = {
      likeNew: 0.85,     // 15% off retail
      veryGood: 0.75,    // 25% off
      good: 0.65,        // 35% off
      acceptable: 0.50,  // 50% off
    };

    const multiplier = minimumCondition ? conditionMultipliers[minimumCondition] || 0.7 : 0.7;
    return Math.round(basePrice * multiplier * 100) / 100;
  };

  const formatCondition = (cond: string): string => {
    const conditionKeys: Record<string, 'likeNew' | 'veryGood' | 'good' | 'acceptable'> = {
      likeNew: 'likeNew',
      veryGood: 'veryGood',
      good: 'good',
      acceptable: 'acceptable',
    };
    const key = conditionKeys[cond];
    return key ? tConditions(key) : cond;
  };

  if (!bggGameId) {
    return null;
  }

  if (loading) {
    return (
      <Card padding="md" className="bg-aurora-orange/5 border-aurora-orange/20 mb-4">
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
  const suggestedBudget = getSuggestedBudget();

  // If no pricing data available at all, don't show the component
  if (!external?.lowestPrice && !internal?.medianSoldPrice && !internal?.lowestActivePrice) {
    return null;
  }

  return (
    <Card padding="md" className="bg-aurora-orange/5 border border-aurora-orange/20 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-aurora-orange" />
        <h4 className="font-semibold text-polar-night text-sm">{t('title')}</h4>
      </div>

      <div className="space-y-3">
        {/* External Retail Price */}
        {external?.lowestPrice && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">{t('newRetail')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-polar-night tabular-nums">
                €{external.lowestPrice.toFixed(2)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onFillBudget(external.lowestPrice!)}
                className="text-xs px-3 h-7"
              >
                {t('fillButton')}
              </Button>
            </div>
          </div>
        )}

        {/* Marketplace Data separator */}
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
                €{internal.medianSoldPrice.toFixed(2)}
              </span>
              <span className="text-xs text-text-muted">
                ({t('salesCount', { count: internal.completedSalesCount })})
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onFillBudget(internal.medianSoldPrice!)}
                className="text-xs px-3 h-7"
              >
                {t('fillButton')}
              </Button>
            </div>
          </div>
        )}

        {/* Current Listings on Second Turn */}
        {internal?.lowestActivePrice && internal.activeListingCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              {t('lowestOnSecondTurn')}
            </span>
            <span className="text-text-secondary tabular-nums">
              €{internal.lowestActivePrice.toFixed(2)}
            </span>
          </div>
        )}

        {/* Suggested Budget */}
        {suggestedBudget && minimumCondition && (
          <div className="pt-3 mt-3 border-t border-aurora-orange/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-aurora-orange">
                  {t('suggestedFor', { condition: formatCondition(minimumCondition) })}
                </span>
                <span
                  className="text-aurora-orange/70 cursor-help"
                  title={t('suggestionTooltip', { condition: formatCondition(minimumCondition) })}
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-aurora-orange text-lg tabular-nums">
                  €{suggestedBudget.toFixed(2)}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onFillBudget(suggestedBudget)}
                  className="h-8 px-4"
                >
                  {t('useBudget')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Attribution */}
        {external?.attribution && (
          <div className="pt-3 mt-3 border-t border-aurora-orange/10 flex items-center justify-between">
            <a
              href={external.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-aurora-orange flex items-center gap-1 transition-colors"
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
