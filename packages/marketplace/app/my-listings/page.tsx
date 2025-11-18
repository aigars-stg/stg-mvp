'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button, Card } from '@second-turn/design-system';
import { Package, Clock, CheckCircle, XCircle, Plus, Search, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ListingCard } from '@/components/listing/ListingCard';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import { ListingActionsMenu } from '@/components/listing/ListingActionsMenu';
import { StatusChangeModal } from '@/components/listing/StatusChangeModal';
import { DeleteConfirmationModal } from '@/components/listing/DeleteConfirmationModal';
import { NotificationModal } from '@/components/common/NotificationModal';
import type { Listing, ListingStatus } from '@/lib/types/listing';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getStatusLabel } from '@/lib/types/listing';
import { useSavedListings } from '@/lib/hooks/useSavedListings';

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

  // Top-level tab: selling vs wanted vs saved (check URL param)
  const [mainTab, setMainTab] = useState<'selling' | 'wanted' | 'saved'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'wanted') return 'wanted';
      if (tab === 'saved') return 'saved';
      return 'selling';
    }
    return 'selling';
  });

  // Selling (regular listings)
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ListingStatus | 'all'>('all');

  // Wanted listings
  const [wantedListings, setWantedListings] = useState<WantedListingWithDetails[]>([]);
  const [wantedLoading, setWantedLoading] = useState(true);
  const [wantedError, setWantedError] = useState('');
  const [wantedActiveTab, setWantedActiveTab] = useState<'all' | 'active' | 'fulfilled' | 'expired' | 'cancelled'>('all');

  // Saved listings
  const { savedListings, isLoading: savedLoading, error: savedError } = useSavedListings();

  // Modal state for listing actions
  const [statusChangeModal, setStatusChangeModal] = useState<{
    isOpen: boolean;
    listing: Listing | null;
    newStatus: ListingStatus | null;
  }>({ isOpen: false, listing: null, newStatus: null });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    listing: Listing | null;
  }>({ isOpen: false, listing: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showClipboardSuccess, setShowClipboardSuccess] = useState(false);

  // Fetch regular listings
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

  // Fetch wanted listings
  useEffect(() => {
    if (!user) return;

    const fetchWantedListings = async () => {
      try {
        setWantedLoading(true);
        console.log('Fetching wanted listings for user:', user.id);
        const response = await fetch('/api/wanted/my-listings');

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to fetch wanted listings:', errorData);
          throw new Error(errorData.error || 'Failed to fetch wanted listings');
        }

        const data = await response.json();
        console.log('Wanted listings response:', data);
        setWantedListings(data.wantedListings || []);
      } catch (err: any) {
        console.error('Error fetching wanted listings:', err);
        setWantedError(err.message || 'Failed to load wanted listings');
      } finally {
        setWantedLoading(false);
      }
    };

    fetchWantedListings();
  }, [user]);

  // Handler functions for listing actions
  const handleStatusChangeRequest = (listing: Listing, newStatus: ListingStatus) => {
    setStatusChangeModal({
      isOpen: true,
      listing,
      newStatus,
    });
  };

  const handleStatusChange = async () => {
    if (!statusChangeModal.listing || !statusChangeModal.newStatus) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/listings/${statusChangeModal.listing.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusChangeModal.newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      // Update local state with optimistic update
      setListings((prev) =>
        prev.map((l) =>
          l.id === statusChangeModal.listing?.id
            ? { ...l, status: statusChangeModal.newStatus! }
            : l
        )
      );

      setSuccessMessage(`Listing ${statusChangeModal.newStatus === 'sold' ? 'marked as sold' : statusChangeModal.newStatus === 'removed' ? 'removed' : statusChangeModal.newStatus === 'active' ? 'reactivated' : 'updated'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);

      setStatusChangeModal({ isOpen: false, listing: null, newStatus: null });
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message || 'Failed to update listing status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = (listing: Listing) => {
    setDeleteModal({
      isOpen: true,
      listing,
    });
  };

  const handleDelete = async () => {
    if (!deleteModal.listing) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/listings/${deleteModal.listing.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete listing');
      }

      // Remove from local state
      setListings((prev) => prev.filter((l) => l.id !== deleteModal.listing?.id));

      setSuccessMessage('Listing permanently deleted');
      setTimeout(() => setSuccessMessage(''), 3000);

      setDeleteModal({ isOpen: false, listing: null });
    } catch (err: any) {
      console.error('Error deleting listing:', err);
      setError(err.message || 'Failed to delete listing');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter regular listings
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

  // Filter wanted listings
  const filteredWantedListings = wantedActiveTab === 'all'
    ? wantedListings
    : wantedListings.filter((listing) => listing.status === wantedActiveTab);

  const wantedStatusCounts = {
    all: wantedListings.length,
    active: wantedListings.filter((l) => l.status === 'active').length,
    fulfilled: wantedListings.filter((l) => l.status === 'fulfilled').length,
    expired: wantedListings.filter((l) => l.status === 'expired').length,
    cancelled: wantedListings.filter((l) => l.status === 'cancelled').length,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">My Listings</h1>
            <p className="text-sm sm:text-base text-text-secondary">
              Manage your selling and buying activity
            </p>
          </div>
          <div className="hidden sm:flex sm:flex-row gap-2 sm:gap-3">
            <Link href="/wanted/new" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" fullWidth className="sm:w-auto">
                <Search className="w-5 h-5 mr-2" />
                Looking For
              </Button>
            </Link>
            <Link href="/sell" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" fullWidth className="sm:w-auto">
                <Plus className="w-5 h-5 mr-2" />
                Sell a Game
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setMainTab('selling')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${
              mainTab === 'selling'
                ? 'bg-frost-ice text-snow-white shadow-md'
                : 'bg-snow-white text-polar-night hover:bg-gray-50 border border-border'
            }`}
          >
            <Package className="w-5 h-5 inline mr-2" />
            Selling ({listings.length})
          </button>
          <button
            onClick={() => setMainTab('wanted')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${
              mainTab === 'wanted'
                ? 'bg-aurora-orange text-snow-white shadow-md'
                : 'bg-snow-white text-polar-night hover:bg-gray-50 border border-border'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Looking For ({wantedListings.length})
          </button>
          <button
            onClick={() => setMainTab('saved')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${
              mainTab === 'saved'
                ? 'bg-aurora-red text-snow-white shadow-md'
                : 'bg-snow-white text-polar-night hover:bg-gray-50 border border-border'
            }`}
          >
            <Heart className="w-5 h-5 inline mr-2" />
            Saved ({savedListings.length})
          </button>
        </div>

        {/* Status Tabs - Selling */}
        {mainTab === 'selling' && (
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
        )}

        {/* Status Tabs - Wanted */}
        {mainTab === 'wanted' && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {(['all', 'active', 'fulfilled', 'expired', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setWantedActiveTab(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  wantedActiveTab === status
                    ? 'bg-aurora-orange text-snow-white'
                    : 'bg-bg-elevated text-text-secondary hover:bg-border'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}{' '}
                <span
                  className={`${
                    wantedActiveTab === status ? 'text-snow-white/80' : 'text-text-muted'
                  }`}
                >
                  ({wantedStatusCounts[status]})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* SELLING TAB CONTENT */}
        {mainTab === 'selling' && (
          <>
            {/* Success Message */}
            {successMessage && (
              <Card padding="md" className="mb-6 bg-aurora-green/10 border border-aurora-green/20">
                <p className="text-sm text-aurora-green">{successMessage}</p>
              </Card>
            )}

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
                    <div className="absolute top-3 left-3 z-10">
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

                    {/* Actions Menu Overlay */}
                    <div className="absolute top-3 right-3 z-10">
                      <ListingActionsMenu
                        listingId={listing.id}
                        status={listing.status}
                        onStatusChange={(newStatus) => handleStatusChangeRequest(listing, newStatus)}
                        onDelete={() => handleDeleteRequest(listing)}
                        onLinkCopied={() => setShowClipboardSuccess(true)}
                      />
                    </div>

                    <ListingCard listing={listing as any} isOwnListing={true} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* WANTED TAB CONTENT */}
        {mainTab === 'wanted' && (
          <>
            {/* Error Message */}
            {wantedError && (
              <Card padding="md" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
                <p className="text-sm text-aurora-red">{wantedError}</p>
              </Card>
            )}

            {/* Loading State */}
            {wantedLoading && (
              <div className="text-center py-12">
                <p className="text-text-secondary">Loading your wanted listings...</p>
              </div>
            )}

            {/* Empty State */}
            {!wantedLoading && filteredWantedListings.length === 0 && (
              <Card padding="lg" className="text-center">
                <Search className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-polar-night mb-2">
                  {wantedActiveTab === 'all'
                    ? 'No wanted listings yet'
                    : `No ${wantedActiveTab} wanted listings`}
                </h3>
                <p className="text-text-secondary mb-6">
                  {wantedActiveTab === 'all'
                    ? 'Start posting games you\'re looking for'
                    : `You don't have any ${wantedActiveTab} wanted listings at the moment`}
                </p>
                {wantedActiveTab === 'all' && (
                  <Link href="/wanted/new">
                    <Button variant="accent">
                      <Search className="w-5 h-5 mr-2" />
                      Post Your First ISO
                    </Button>
                  </Link>
                )}
              </Card>
            )}

            {/* Wanted Listings Grid */}
            {!wantedLoading && filteredWantedListings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredWantedListings.map((listing) => (
                  <WantedListingCard
                    key={listing.id}
                    wantedListing={listing}
                    showBuyer={false}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* SAVED TAB CONTENT */}
        {mainTab === 'saved' && (
          <>
            {/* Error Message */}
            {savedError && (
              <Card padding="md" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
                <p className="text-sm text-aurora-red">{savedError}</p>
              </Card>
            )}

            {/* Loading State */}
            {savedLoading && (
              <div className="text-center py-12">
                <p className="text-text-secondary">Loading your saved listings...</p>
              </div>
            )}

            {/* Empty State */}
            {!savedLoading && savedListings.length === 0 && (
              <Card padding="lg" className="text-center">
                <Heart className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-polar-night mb-2">
                  No saved listings yet
                </h3>
                <p className="text-text-secondary mb-6">
                  Start saving listings you're interested in by clicking the heart icon on any listing card or detail page.
                </p>
                <Link href="/browse">
                  <Button variant="primary">
                    <Search className="w-5 h-5 mr-2" />
                    Browse Listings
                  </Button>
                </Link>
              </Card>
            )}

            {/* Saved Listings Grid */}
            {!savedLoading && savedListings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {savedListings.map((savedListing) => (
                  <ListingCard
                    key={savedListing.id}
                    listing={savedListing.listing}
                    showSeller={true}
                    isOwnListing={false}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {statusChangeModal.listing && (
        <StatusChangeModal
          isOpen={statusChangeModal.isOpen}
          onClose={() => setStatusChangeModal({ isOpen: false, listing: null, newStatus: null })}
          onConfirm={handleStatusChange}
          currentStatus={statusChangeModal.listing.status}
          newStatus={statusChangeModal.newStatus!}
          gameName={statusChangeModal.listing.game_name}
          isLoading={actionLoading}
        />
      )}

      {deleteModal.listing && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, listing: null })}
          onConfirm={handleDelete}
          gameName={deleteModal.listing.game_name}
          isLoading={actionLoading}
        />
      )}

      {/* Clipboard Success Modal */}
      <NotificationModal
        isOpen={showClipboardSuccess}
        onClose={() => setShowClipboardSuccess(false)}
        type="success"
        message="Link copied to clipboard!"
      />
    </div>
  );
}
