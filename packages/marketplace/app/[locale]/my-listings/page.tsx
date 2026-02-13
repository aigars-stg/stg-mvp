'use client';

import { Suspense } from 'react';
import { Button, Card } from '@second-turn/design-system';
import { Package, Time as Clock, CheckCircle, CloseCircle as XCircle, Plus, Search, Heart, Layout as LayoutDashboard } from '@/lib/icons';
import { Link } from '@/i18n/navigation';
import { OfferCard } from '@/components/game/OfferCard';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import { ListingActionsMenu } from '@/components/listing/ListingActionsMenu';
import { StatusChangeModal } from '@/components/listing/StatusChangeModal';
import { DeleteConfirmationModal } from '@/components/listing/DeleteConfirmationModal';
import { WantedListingActionsMenu } from '@/components/wanted/WantedListingActionsMenu';
import { WantedStatusChangeModal } from '@/components/wanted/WantedStatusChangeModal';
import { WantedDeleteConfirmationModal } from '@/components/wanted/WantedDeleteConfirmationModal';
import { NotificationModal } from '@/components/common/NotificationModal';
import { getStatusLabel, type ListingWithSeller } from '@/lib/types/listing';
import { getWantedStatusLabel } from '@/lib/types/wanted-listing';
import { OfflineError } from '@/components/common/OfflineError';
import { useTranslations } from 'next-intl';
import { useMyListings } from '@/lib/hooks/useMyListings';

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
  const t = useTranslations('MyListings');
  const tListings = useTranslations('Listings');

  const {
    user,
    mainTab,
    setMainTab,
    listings,
    loading,
    error,
    isOffline,
    activeTab,
    setActiveTab,
    filteredListings,
    statusCounts,
    statusChangeModal,
    deleteModal,
    actionLoading,
    successMessage,
    showClipboardSuccess,
    setShowClipboardSuccess,
    handleStatusChangeRequest,
    handleStatusChange,
    handleDeleteRequest,
    handleDelete,
    closeStatusChangeModal,
    closeDeleteModal,
    wantedListings,
    wantedLoading,
    wantedError,
    wantedIsOffline,
    wantedActiveTab,
    setWantedActiveTab,
    filteredWantedListings,
    wantedStatusCounts,
    wantedStatusChangeModal,
    wantedDeleteModal,
    wantedActionLoading,
    wantedSuccessMessage,
    handleWantedStatusChangeRequest,
    handleWantedStatusChange,
    handleWantedDeleteRequest,
    handleWantedDelete,
    closeWantedStatusChangeModal,
    closeWantedDeleteModal,
    savedListings,
    savedLoading,
    savedError,
    refetchSavedListings,
  } = useMyListings();

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
    <div className="min-h-screen bg-bg py-6 px-4 sm:px-6">
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
              : 'bg-snow-white text-polar-night hover:bg-bg-secondary border border-border'
              }`}
          >
            <Package className="w-5 h-5 inline mr-2" />
            {t('tabs.selling')} ({listings.length})
          </button>
          <button
            onClick={() => setMainTab('wanted')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${mainTab === 'wanted'
              ? 'bg-aurora-orange text-snow-white shadow-md'
              : 'bg-snow-white text-polar-night hover:bg-bg-secondary border border-border'
              }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            {t('tabs.lookingFor')} ({wantedListings.length})
          </button>
          <button
            onClick={() => setMainTab('saved')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex-1 sm:flex-initial ${mainTab === 'saved'
              ? 'bg-aurora-red text-snow-white shadow-md'
              : 'bg-snow-white text-polar-night hover:bg-bg-secondary border border-border'
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
                    <OfferCard listing={listing as ListingWithSeller} />
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
                    <Button variant="primary">
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
          onClose={closeStatusChangeModal}
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
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
          gameName={deleteModal.listing.game_name}
          isLoading={actionLoading}
        />
      )}

      {/* Wanted Listing Modals */}
      {wantedStatusChangeModal.listing && (
        <WantedStatusChangeModal
          isOpen={wantedStatusChangeModal.isOpen}
          onClose={closeWantedStatusChangeModal}
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
          onClose={closeWantedDeleteModal}
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
