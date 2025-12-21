'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@second-turn/design-system';
import { TrendingUp, ExternalLink, Loader2, AlertCircle, Tag, BarChart3 } from 'lucide-react';

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

interface PricingAssistantProps {
  bggGameId: number;
  condition?: string | null;
  onFillPrice: (price: number) => void;
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
}: PricingAssistantProps) {
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
      } catch (err: any) {
        console.error('[PricingAssistant] Fetch error:', err);
        setError('Unable to load pricing suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [bggGameId]);

  // Calculate suggested price based on condition
  const getSuggestedPrice = (): number | null => {
    if (!pricingData) return null;

    const { external, internal } = pricingData;

    // Priority: median sold price > external lowest > lowest active listing
    const basePrice =
      internal?.medianSoldPrice ||
      external?.lowestPrice ||
      internal?.lowestActivePrice;

    if (!basePrice) return null;

    // Apply condition discount from new retail
    const conditionMultipliers: Record<string, number> = {
      likeNew: 0.85, // 15% off new retail
      veryGood: 0.75, // 25% off
      good: 0.65, // 35% off
      acceptable: 0.5, // 50% off
    };

    const multiplier = condition ? conditionMultipliers[condition] || 0.7 : 0.7;
    return Math.round(basePrice * multiplier * 100) / 100;
  };

  const formatCondition = (cond: string): string => {
    const labels: Record<string, string> = {
      likeNew: 'Like New',
      veryGood: 'Very Good',
      good: 'Good',
      acceptable: 'Acceptable',
    };
    return labels[cond] || cond;
  };

  if (!bggGameId) {
    return null;
  }

  if (loading) {
    return (
      <Card padding="md" className="bg-frost-ice/5 border-frost-ice/20 mb-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading pricing data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" className="bg-aurora-yellow/5 border border-aurora-yellow/20 mb-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <AlertCircle className="w-4 h-4 text-aurora-yellow" />
          <span className="text-sm">{error}</span>
        </div>
      </Card>
    );
  }

  if (!pricingData) return null;

  const { external, internal } = pricingData;
  const suggestedPrice = getSuggestedPrice();

  // If no pricing data available at all, don't show the component
  if (!external?.lowestPrice && !internal?.medianSoldPrice && !internal?.lowestActivePrice) {
    return null;
  }

  return (
    <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-frost-ice" />
        <h4 className="font-semibold text-polar-night text-sm">Pricing assistant</h4>
      </div>

      <div className="space-y-3">
        {/* External Retail Price */}
        {external?.lowestPrice && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">New retail:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-polar-night">
                {external.lowestPrice.toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFillPrice(external.lowestPrice!)}
                className="text-xs px-2 h-7"
              >
                Fill
              </Button>
            </div>
          </div>
        )}

        {/* Internal Median Sold Price */}
        {internal?.medianSoldPrice && internal.completedSalesCount >= 3 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">Avg. Used Sold:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-polar-night">
                {internal.medianSoldPrice.toFixed(2)}
              </span>
              <span className="text-xs text-text-muted">
                ({internal.completedSalesCount} sales)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFillPrice(internal.medianSoldPrice!)}
                className="text-xs px-2 h-7"
              >
                Fill
              </Button>
            </div>
          </div>
        )}

        {/* Current Competition */}
        {internal?.lowestActivePrice && internal.activeListingCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              Lowest active listing:
            </span>
            <span className="text-text-secondary">
              {internal.lowestActivePrice.toFixed(2)} ({internal.activeListingCount} listed)
            </span>
          </div>
        )}

        {/* Suggested Price */}
        {suggestedPrice && condition && (
          <div className="pt-3 mt-3 border-t border-frost-ice/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-frost-ice">
                Suggested for {formatCondition(condition)}:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-frost-ice text-lg">
                  {suggestedPrice.toFixed(2)}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onFillPrice(suggestedPrice)}
                  className="h-8"
                >
                  Use price
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Attribution */}
        {external?.attribution && (
          <div className="pt-3 mt-3 border-t border-frost-ice/10">
            <a
              href={external.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-frost-ice flex items-center gap-1 transition-colors"
            >
              {external.attribution.text}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
