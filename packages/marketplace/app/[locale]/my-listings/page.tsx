'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button, Card } from '@second-turn/design-system';
import {  Package, Time as Clock, CheckCircle, CloseCircle as XCircle, Plus, Search, Heart, Layout as LayoutDashboard  } from 'griddy-icons';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { OfferCard } from '@/components/game/OfferCard';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import { ListingActionsMenu } from '@/components/listing/ListingActionsMenu';
import { StatusChangeModal } from '@/components/listing/StatusChangeModal';
import { DeleteConfirmationModal } from '@/components/listing/DeleteConfirmationModal';
import { WantedListingActionsMenu } from '@/components/wanted/WantedListingActionsMenu';
import { WantedStatusChangeModal } from '@/components/wanted/WantedStatusChangeModal';
import { WantedDeleteConfirmationModal } from '@/components/wanted/WantedDeleteConfirmationModal';
import { NotificationModal } from '@/components/common/NotificationModal';
import type { Listing, ListingStatus } from '@/lib/types/listing';
import type { WantedListingWithDetails, WantedListingStatus } from '@/lib/types/wanted-listing';
import { getStatusLabel } from '@/lib/types/listing';
import { getWantedStatusLabel } from '@/lib/types/wanted-listing';
import { useSavedListings } from '@/lib/hooks/useSavedListings';
import { isOfflineError } from '@/lib/utils/offline';
import { OfflineError } from '@/components/common/OfflineError';
import { useTranslations } from 'next-intl';

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

const WANTED_STATUS_ICONS = {
  active: CheckCircle,
  fulfilled: CheckCircle,
  cancelled: XCircle,
};

const WANTED_STATUS_COLORS = {
  active: 'text-aurora-green',
  fulfilled: 'text-frost-ice',
  cancelled: 'text-text-muted',
};

function MyListingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('MyListings');
  const tListings = useTranslations('Listings');

  // Top-level tab: selling vs wanted vs saved (check URL param)
  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState<'selling' | 'wanted' | 'saved'>('selling');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'wanted') setMainTab('wanted');
    else if (tab === 'saved') setMainTab('saved');
    else setMainTab('selling');
  }, [searchParams]);

  // Selling (regular listings)
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<ListingStatus | 'all'>('all');

  // Wanted listings
  const [wantedListings, setWantedListings] = useState<WantedListingWithDetails[]>([]);
  const [wantedLoading, setWantedLoading] = useState(true);
  const [wantedError, setWantedError] = useState('');
  const [wantedIsOffline, setWantedIsOffline] = useState(false);
  const [wantedActiveTab, setWantedActiveTab] = useState<'all' | 'active' | 'fulfilled' | 'cancelled'>('all');

  // Saved listings
  const { savedListings, isLoading: savedLoading, error: savedError, refetch: refetchSavedListings } = useSavedListings();

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

  // Modal state for wanted listing actions
  const [wantedStatusChangeModal, setWantedStatusChangeModal] = useState<{
    isOpen: boolean;
    listing: WantedListingWithDetails | null;
    newStatus: WantedListingStatus | null;
  }>({ isOpen: false, listing: null, newStatus: null });
  const [wantedDeleteModal, setWantedDeleteModal] = useState<{
    isOpen: boolean;
    listing: WantedListingWithDetails | null;
  }>({ isOpen: false, listing: null });
  const [wantedActionLoading, setWantedActionLoading] = useState(false);
  const [wantedSuccessMessage, setWantedSuccessMessage] = useState('');

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
        setIsOffline(false);
        setError('');
      } catch (err: unknown) {
        console.error('Error fetching listings:', err);
        if (isOfflineError(err)) {
          setIsOffline(true);
          setError('');
        } else {
          setIsOffline(false);
          setError(err instanceof Error ? err.message : 'Failed to load listings');
        }
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
        setWantedIsOffline(false);
        setWantedError('');
      } catch (err: unknown) {
        console.error('Error fetching wanted listings:', err);
        if (isOfflineError(err)) {
          setWantedIsOffline(true);
          setWantedError('');
        } else {
          setWantedIsOffline(false);
          setWantedError(err instanceof Error ? err.message : 'Failed to load wanted listings');
        }
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

  // Handler functions for wanted listing actions
  const handleWantedStatusChangeRequest = (listing: WantedListingWithDetails, newStatus: WantedListingStatus) => {
    setWantedStatusChangeModal({
      isOpen: true,
      listing,
      newStatus,
    });
  };

  const handleWantedStatusChange = async () => {
    if (!wantedStatusChangeModal.listing || !wantedStatusChangeModal.newStatus) return;

    try {
      setWantedActionLoading(true);
      const response = await fetch(`/api/wanted/${wantedStatusChangeModal.listing.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: wantedStatusChangeModal.newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      // Update local state with optimistic update
      setWantedListings((prev) =>
        prev.map((l) =>
          l.id === wantedStatusChangeModal.listing?.id
            ? { ...l, status: wantedStatusChangeModal.newStatus! }
            : l
        )
      );

      setWantedSuccessMessage(`Wanted listing ${wantedStatusChangeModal.newStatus === 'fulfilled' ? 'marked as fulfilled' : wantedStatusChangeModal.newStatus === 'cancelled' ? 'cancelled' : wantedStatusChangeModal.newStatus === 'active' ? 'reactivated' : 'updated'} successfully`);
      setTimeout(() => setWantedSuccessMessage(''), 3000);

      setWantedStatusChangeModal({ isOpen: false, listing: null, newStatus: null });
    } catch (err: any) {
      console.error('Error updating wanted listing status:', err);
      setWantedError(err.message || 'Failed to update wanted listing status');
    } finally {
      setWantedActionLoading(false);
    }
  };

  const handleWantedDeleteRequest = (listing: WantedListingWithDetails) => {
    setWantedDeleteModal({
      isOpen: true,
      listing,
    });
  };

  const handleWantedDelete = async () => {
    if (!wantedDeleteModal.listing) return;

    try {
      setWantedActionLoading(true);
      const response = await fetch(`/api/wanted/${wantedDeleteModal.listing.id}?hard=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete wanted listing');
      }

      // Remove from local state
      setWantedListings((prev) => prev.filter((l) => l.id !== wantedDeleteModal.listing?.id));

      setWantedSuccessMessage('Wanted listing permanently deleted');
      setTimeout(() => setWantedSuccessMessage(''), 3000);

      setWantedDeleteModal({ isOpen: false, listing: null });
    } catch (err: any) {
      console.error('Error deleting wanted listing:', err);
      setWantedError(err.message || 'Failed to delete wanted listing');
    } finally {
      setWantedActionLoading(false);
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
    cancelled: wantedListings.filter((l) => l.status === 'cancelled').length,
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">{t('loading')}</p>
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
            <div className="flex items-center gap-3 mb-2">
              <LayoutDashboard className="w-8 h-8 text-frost-ice" />
              <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
            </div>
            <p className="text-sm sm:text-base text-text-secondary">
              {t('subtitle')}
            </p>
          </div>
          <div className="hidden sm:flex sm:flex-row gap-2 sm:gap-3">
            <Link href="/wanted/new" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" fullWidth className="sm:w-auto">
                {t('buttons.requestGame')}
              </Button>
            </Link>
            <Link href="/sell" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" fullWidth className="sm:w-auto">
                {t('buttons.sellGame')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setMainTab('selling')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${mainTab === 'selling'
              ? 'bg-frost-ice text-snow-white shadow-md'
              : 'bg-snow-white text-polar-night hover:bg-gray-50 border border-border'
              }`}
          >
            <Package className="w-5 h-5 inline mr-2" />
            {t('tabs.selling')} ({listings.length})
          </button>
          <button
            onClick={() => setMainTab('wanted')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${mainTab === 'wanted'
              ? 'bg-aurora-orange text-snow-white shadow-md'
              : 'bg-snow-white text-polar-night hover:bg-gray-50 border border-border'
              }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            {t('tabs.lookingFor')} ({wantedListings.length})
          </button>
          <button
            onClick={() => setMainTab('saved')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${mainTab === 'saved'
              ? 'bg-aurora-red text-snow-white shadow-md'
              : 'bg-snow-white text-polar-night hover:bg-gray-50 border border-border'
              }`}
          >
            <Heart className="w-5 h-5 inline mr-2" />
            {t('tabs.saved')} ({savedListings.length})
          </button>
        </div>

        {/* Status Tabs - Selling */}
        {mainTab === 'selling' && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {(['all', 'active', 'draft', 'sold', 'removed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === status
                  ? 'bg-frost-ice text-snow-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-border'
                  }`}
              >
                {status === 'all' ? t('statusTabs.all') : tListings(`statuses.${status}`)}{' '}
                <span
                  className={`${activeTab === status ? 'text-snow-white/80' : 'text-text-muted'
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
            {(['all', 'active', 'fulfilled', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setWantedActiveTab(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${wantedActiveTab === status
                  ? 'bg-aurora-orange text-snow-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-border'
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}{' '}
                <span
                  className={`${wantedActiveTab === status ? 'text-snow-white/80' : 'text-text-muted'
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

            {/* Offline State */}
            {isOffline && !loading && (
              <OfflineError
                onRetry={() => window.location.reload()}
                message={t('selling.offlineError')}
              />
            )}

            {/* Error Message */}
            {error && !isOffline && (
              <Card padding="md" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
                <p className="text-sm text-aurora-red">{error}</p>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <p className="text-text-secondary">{t('selling.loading')}</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !isOffline && filteredListings.length === 0 && (
              <Card padding="lg" className="text-center min-h-[60vh] flex flex-col justify-center items-center">
                <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-polar-night mb-2">
                  {activeTab === 'all'
                    ? t('selling.emptyAll.title')
                    : t('selling.emptyFiltered.title', { status: tListings(`statuses.${activeTab}`).toLowerCase() })}
                </h3>
                <p className="text-text-secondary mb-6">
                  {activeTab === 'all'
                    ? t('selling.emptyAll.description')
                    : t('selling.emptyFiltered.description', { status: tListings(`statuses.${activeTab}`).toLowerCase() })}
                </p>
                {activeTab === 'all' && (
                  <Link href="/sell">
                    <Button variant="primary">
                      <Plus className="w-5 h-5 mr-2" />
                      {t('selling.emptyAll.button')}
                    </Button>
                  </Link>
                )}
              </Card>
            )}

            {/* Listings List */}
            {!loading && !isOffline && filteredListings.length > 0 && (
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <div key={listing.id}>
                    {/* Status & Actions Header */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className={`px-3 py-1 rounded-full bg-bg-secondary flex items-center gap-1.5 ${STATUS_COLORS[listing.status]}`}>
                        {(() => {
                          const StatusIcon = STATUS_ICONS[listing.status];
                          return <StatusIcon className="w-4 h-4" />;
                        })()}
                        <span className="text-xs font-medium">
                          {getStatusLabel(listing.status)}
                        </span>
                      </div>
                      <ListingActionsMenu
                        listingId={listing.id}
                        bggGameId={listing.bgg_game_id}
                        status={listing.status}
                        onStatusChange={(newStatus) => handleStatusChangeRequest(listing, newStatus)}
                        onDelete={() => handleDeleteRequest(listing)}
                        onLinkCopied={() => setShowClipboardSuccess(true)}
                      />
                    </div>
                    <OfferCard listing={listing as any} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* WANTED TAB CONTENT */}
        {mainTab === 'wanted' && (
          <>
            {/* Offline State */}
            {wantedIsOffline && !wantedLoading && (
              <OfflineError
                onRetry={() => window.location.reload()}
                message={t('wanted.offlineError')}
              />
            )}

            {/* Error Message */}
            {wantedError && !wantedIsOffline && (
              <Card padding="md" className="mb-6 bg-aurora-red/10 border border-aurora-red/20">
                <p className="text-sm text-aurora-red">{wantedError}</p>
              </Card>
            )}

            {/* Loading State */}
            {wantedLoading && (
              <div className="text-center py-12">
                <p className="text-text-secondary">{t('wanted.loading')}</p>
              </div>
            )}

            {/* Empty State */}
            {!wantedLoading && !wantedIsOffline && filteredWantedListings.length === 0 && (
              <Card padding="lg" className="text-center min-h-[60vh] flex flex-col justify-center items-center">
                <Search className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-polar-night mb-2">
                  {wantedActiveTab === 'all'
                    ? t('wanted.emptyAll.title')
                    : t('wanted.emptyFiltered.title', { status: wantedActiveTab })}
                </h3>
                <p className="text-text-secondary mb-6">
                  {wantedActiveTab === 'all'
                    ? t('wanted.emptyAll.description')
                    : t('wanted.emptyFiltered.description', { status: wantedActiveTab })}
                </p>
                {wantedActiveTab === 'all' && (
                  <Link href="/wanted/new">
                    <Button variant="accent">
                      <Search className="w-5 h-5 mr-2" />
                      {t('wanted.emptyAll.button')}
                    </Button>
                  </Link>
                )}
              </Card>
            )}

            {/* Success Message */}
            {wantedSuccessMessage && (
              <Card padding="md" className="mb-6 bg-aurora-green/10 border border-aurora-green/20">
                <p className="text-sm text-aurora-green">{wantedSuccessMessage}</p>
              </Card>
            )}

            {/* Wanted Listings Grid */}
            {!wantedLoading && !wantedIsOffline && filteredWantedListings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredWantedListings.map((listing) => (
                  <div key={listing.id} className="relative">
                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 left-3 z-10">
                      <div className={`px-3 py-1 rounded-full bg-snow-white shadow-md flex items-center gap-1.5 ${WANTED_STATUS_COLORS[listing.status]}`}>
                        {(() => {
                          const StatusIcon = WANTED_STATUS_ICONS[listing.status];
                          return <StatusIcon className="w-4 h-4" />;
                        })()}
                        <span className="text-xs font-medium">
                          {getWantedStatusLabel(listing.status)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Menu Overlay */}
                    <div className="absolute top-3 right-3 z-10">
                      <WantedListingActionsMenu
                        listingId={listing.id}
                        bggGameId={listing.bgg_game_id}
                        status={listing.status}
                        onStatusChange={(newStatus) => handleWantedStatusChangeRequest(listing, newStatus)}
                        onDelete={() => handleWantedDeleteRequest(listing)}
                        onLinkCopied={() => setShowClipboardSuccess(true)}
                      />
                    </div>

                    <WantedListingCard
                      wantedListing={listing}
                      showBuyer={false}
                    />
                  </div>
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
                <p className="text-text-secondary">{t('saved.loading')}</p>
              </div>
            )}

            {/* Empty State */}
            {!savedLoading && savedListings.length === 0 && (
              <Card padding="lg" className="text-center min-h-[60vh] flex flex-col justify-center items-center">
                <Heart className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-polar-night mb-2">
                  {t('saved.empty.title')}
                </h3>
                <p className="text-text-secondary mb-6">
                  {t('saved.empty.description')}
                </p>
                <Link href="/browse">
                  <Button variant="primary">
                    <Search className="w-5 h-5 mr-2" />
                    {t('saved.empty.button')}
                  </Button>
                </Link>
              </Card>
            )}

            {/* Saved Listings List */}
            {!savedLoading && savedListings.length > 0 && (
              <div className="space-y-4">
                {savedListings.map((savedListing) => (
                  <OfferCard
                    key={savedListing.id}
                    listing={savedListing.listing}
                    onSaveChange={(_, saved) => {
                      // When unsaved, refetch to remove from list
                      if (!saved) refetchSavedListings();
                    }}
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

      {/* Wanted Listing Modals */}
      {wantedStatusChangeModal.listing && (
        <WantedStatusChangeModal
          isOpen={wantedStatusChangeModal.isOpen}
          onClose={() => setWantedStatusChangeModal({ isOpen: false, listing: null, newStatus: null })}
          onConfirm={handleWantedStatusChange}
          currentStatus={wantedStatusChangeModal.listing.status}
          newStatus={wantedStatusChangeModal.newStatus!}
          gameName={wantedStatusChangeModal.listing.game_name}
          isLoading={wantedActionLoading}
        />
      )}

      {wantedDeleteModal.listing && (
        <WantedDeleteConfirmationModal
          isOpen={wantedDeleteModal.isOpen}
          onClose={() => setWantedDeleteModal({ isOpen: false, listing: null })}
          onConfirm={handleWantedDelete}
          gameName={wantedDeleteModal.listing.game_name}
          isLoading={wantedActionLoading}
        />
      )}

      {/* Clipboard Success Modal */}
      <NotificationModal
        isOpen={showClipboardSuccess}
        onClose={() => setShowClipboardSuccess(false)}
        type="success"
        message={t('clipboard.success')}
      />
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <MyListingsContent />
    </Suspense>
  );
}
