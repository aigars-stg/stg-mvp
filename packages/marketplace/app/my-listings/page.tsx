'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button, Card } from '@second-turn/design-system';
import { Package, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ListingCard } from '@/components/listing/ListingCard';
import type { Listing, ListingStatus } from '@/lib/types/listing';
import { getStatusLabel } from '@/lib/types/listing';

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  sold: 'Sold',
  removed: 'Removed',
};

const STATUS_ICONS = {
  draft: Clock,
  active: CheckCircle,
  sold: Package,
  removed: XCircle,
};

const STATUS_COLORS = {
  draft: 'text-text-secondary',
  active: 'text-aurora-green',
  sold: 'text-frost-ice',
  removed: 'text-text-muted',
};

export default function MyListingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ListingStatus | 'all'>('all');

  useEffect(() => {
    if (!user) return;

    const fetchListings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/listings?sellerId=${user.id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }

        const data = await response.json();
        setListings(data.listings || []);
      } catch (err: any) {
        console.error('Error fetching listings:', err);
        setError(err.message || 'Failed to load listings');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [user]);

  const filteredListings = activeTab === 'all'
    ? listings
    : listings.filter((listing) => listing.status === activeTab);

  const statusCounts = {
    all: listings.length,
    draft: listings.filter((l) => l.status === 'draft').length,
    active: listings.filter((l) => l.status === 'active').length,
    sold: listings.filter((l) => l.status === 'sold').length,
    removed: listings.filter((l) => l.status === 'removed').length,
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-polar-night mb-2">My Listings</h1>
            <p className="text-text-secondary">
              Manage your game listings and track sales
            </p>
          </div>
          <Link href="/sell">
            <Button variant="primary" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Sell a Game
            </Button>
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {(['all', 'active', 'draft', 'sold', 'removed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === status
                  ? 'bg-frost-ice text-snow-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-border'
              }`}
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status]}{' '}
              <span
                className={`${
                  activeTab === status ? 'text-snow-white/80' : 'text-text-muted'
                }`}
              >
                ({statusCounts[status]})
              </span>
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <Card padding="md" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
            <p className="text-sm text-aurora-red">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-text-secondary">Loading your listings...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredListings.length === 0 && (
          <Card padding="lg" className="text-center">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              {activeTab === 'all'
                ? 'No listings yet'
                : `No ${STATUS_LABELS[activeTab as ListingStatus].toLowerCase()} listings`}
            </h3>
            <p className="text-text-secondary mb-6">
              {activeTab === 'all'
                ? 'Start selling your board games to the community'
                : `You don't have any ${STATUS_LABELS[activeTab as ListingStatus].toLowerCase()} listings at the moment`}
            </p>
            {activeTab === 'all' && (
              <Link href="/sell">
                <Button variant="primary">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Listing
                </Button>
              </Link>
            )}
          </Card>
        )}

        {/* Listings Grid */}
        {!loading && filteredListings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="relative">
                {/* Status Badge Overlay */}
                <div className="absolute top-3 right-3 z-10">
                  <div className={`px-3 py-1 rounded-full bg-snow-white shadow-md flex items-center gap-1.5 ${STATUS_COLORS[listing.status]}`}>
                    {(() => {
                      const StatusIcon = STATUS_ICONS[listing.status];
                      return <StatusIcon className="w-4 h-4" />;
                    })()}
                    <span className="text-xs font-medium">
                      {getStatusLabel(listing.status)}
                    </span>
                  </div>
                </div>

                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
