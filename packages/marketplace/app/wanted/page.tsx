'use client';

import { useState, useEffect } from 'react';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import { Package } from 'lucide-react';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

export default function WantedPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Data state
  const [wantedListings, setWantedListings] = useState<WantedListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch wanted listings
  useEffect(() => {
    async function fetchWantedListings() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/wanted?status=active');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch wanted listings');
        }

        setWantedListings(data.wantedListings || []);
      } catch (err: any) {
        console.error('Error fetching wanted listings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchWantedListings();
  }, []);

  const handleIHaveThis = (wantedListingId: string) => {
    if (!user) {
      router.push(`/auth/signin?redirect=/wanted/${wantedListingId}`);
      return;
    }

    // Navigate to the wanted listing detail page where they can use the modal
    router.push(`/wanted/${wantedListingId}?openModal=true`);
  };

  return (
    <div className="min-h-screen bg-surface-1">
      {/* Header */}
      <div className="bg-surface-0 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-polar-night">Games People Want</h1>
          <p className="mt-2 text-text-secondary">
            Browse buyer requests and respond with "I Have This" to start a conversation
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[600px] bg-surface-0 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-aurora-red/10 border border-aurora-red/20 rounded-lg p-4 text-aurora-red">
            <p className="font-medium">Error loading wanted listings</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && wantedListings.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-polar-night mb-2">
              No wanted listings yet
            </h2>
            <p className="text-text-secondary">
              Be the first to post what you're looking for!
            </p>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && !error && wantedListings.length > 0 && (
          <>
            <div className="mb-4 text-sm text-text-secondary">
              Showing {wantedListings.length} wanted {wantedListings.length === 1 ? 'listing' : 'listings'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wantedListings.map((wantedListing) => (
                <WantedListingCard
                  key={wantedListing.id}
                  wantedListing={wantedListing}
                  onIHaveThis={handleIHaveThis}
                  showBuyer={true}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
