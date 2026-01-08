'use client';

import { useState, useEffect } from 'react';
import { Star, Trophy as Award, TrendUp as TrendingUp, Users, RefreshCw as Loader2, AlertCircle } from 'griddy-icons';
import Link from 'next/link';
import { Button } from '@second-turn/design-system';
import {
  SellerBadgeTier,
  getBadgeLabel,
  formatMemberSince,
} from '@/lib/types/seller';
import { StarRating, BadgeTierPill } from './SellerTrustBadge';

interface TrustData {
  total_reviews: number;
  average_rating: number;
  positive_rating_percent: number;
  total_completed_sales: number;
  member_since: string | null;
  badge_tier: SellerBadgeTier;
}

interface SellerTrustCardProps {
  /** Force refresh when this changes */
  refreshKey?: number;
}

export function SellerTrustCard({ refreshKey = 0 }: SellerTrustCardProps) {
  const [data, setData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrustData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/seller/trust');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch trust data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching trust data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchTrustData();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-frost-ice" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-2 text-aurora-red">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-polar-night">Your Reputation</h3>
        <BadgeTierPill tier={data.badge_tier} size="md" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Rating */}
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-4 h-4 text-amber-400" filled />
            <span className="text-xs text-text-secondary">Rating</span>
          </div>
          {data.total_reviews > 0 ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-polar-night">
                {data.average_rating.toFixed(1)}
              </span>
              <span className="text-sm text-text-secondary">/ 5</span>
            </div>
          ) : (
            <span className="text-sm text-text-muted">No reviews yet</span>
          )}
        </div>

        {/* Reviews */}
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Users className="w-4 h-4 text-frost-ice" />
            <span className="text-xs text-text-secondary">Reviews</span>
          </div>
          <span className="text-2xl font-bold text-polar-night">
            {data.total_reviews}
          </span>
        </div>

        {/* Completed Sales */}
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-aurora-green" />
            <span className="text-xs text-text-secondary">Completed Sales</span>
          </div>
          <span className="text-2xl font-bold text-polar-night">
            {data.total_completed_sales}
          </span>
        </div>

        {/* Positive Rating */}
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-text-secondary">Positive</span>
          </div>
          <span className="text-2xl font-bold text-polar-night">
            {data.total_reviews > 0 ? `${data.positive_rating_percent}%` : '-'}
          </span>
        </div>
      </div>

      {/* Star Display */}
      {data.total_reviews > 0 && (
        <div className="mb-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <StarRating rating={data.average_rating} size="lg" showValue={false} />
            <span className="text-sm text-text-secondary">
              Based on {data.total_reviews} {data.total_reviews === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        </div>
      )}

      {/* Member Since */}
      {data.member_since && (
        <p className="text-xs text-text-muted mb-4">
          {formatMemberSince(data.member_since)}
        </p>
      )}

      {/* Badge Progress Hint */}
      {data.badge_tier === 'new_seller' && (
        <div className="bg-frost-ice/10 rounded-lg p-3 mb-4">
          <p className="text-sm text-frost-arctic">
            <strong>Earn &quot;Trusted Seller&quot; badge:</strong> Complete 5+ sales with 4.5+ rating
          </p>
        </div>
      )}

      {data.badge_tier === 'trusted_seller' && (
        <div className="bg-amber-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-700">
            <strong>Earn &quot;Top Seller&quot; badge:</strong> Complete 25+ sales with 4.8+ rating
          </p>
        </div>
      )}

      {/* View Reviews Link - disabled until /seller/reviews page is implemented
      <Link href="/seller/reviews">
        <Button variant="secondary" size="sm" fullWidth>
          View Your Reviews
        </Button>
      </Link>
      */}
    </div>
  );
}
