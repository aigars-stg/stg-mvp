'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedListings } from '@/lib/hooks/useSavedListings';
import { isOfflineError } from '@/lib/utils/offline';
import type { Listing, ListingStatus } from '@/lib/types/listing';
import type { WantedListingWithDetails, WantedListingStatus } from '@/lib/types/wanted-listing';

export type MainTab = 'selling' | 'wanted' | 'saved';

export interface UseMyListingsReturn {
  // Auth
  user: ReturnType<typeof useAuth>['user'];

  // Main tab
  mainTab: MainTab;
  setMainTab: (tab: MainTab) => void;

  // Selling (regular listings)
  listings: Listing[];
  loading: boolean;
  error: string;
  isOffline: boolean;
  activeTab: ListingStatus | 'all';
  setActiveTab: (tab: ListingStatus | 'all') => void;
  filteredListings: Listing[];
  statusCounts: Record<'all' | ListingStatus, number>;

  // Selling listing actions
  statusChangeModal: { isOpen: boolean; listing: Listing | null; newStatus: ListingStatus | null };
  deleteModal: { isOpen: boolean; listing: Listing | null };
  actionLoading: boolean;
  successMessage: string;
  showClipboardSuccess: boolean;
  setShowClipboardSuccess: (show: boolean) => void;
  handleStatusChangeRequest: (listing: Listing, newStatus: ListingStatus) => void;
  handleStatusChange: () => Promise<void>;
  handleDeleteRequest: (listing: Listing) => void;
  handleDelete: () => Promise<void>;
  closeStatusChangeModal: () => void;
  closeDeleteModal: () => void;

  // Wanted listings
  wantedListings: WantedListingWithDetails[];
  wantedLoading: boolean;
  wantedError: string;
  wantedIsOffline: boolean;
  wantedActiveTab: 'all' | 'active' | 'fulfilled' | 'cancelled';
  setWantedActiveTab: (tab: 'all' | 'active' | 'fulfilled' | 'cancelled') => void;
  filteredWantedListings: WantedListingWithDetails[];
  wantedStatusCounts: Record<'all' | 'active' | 'fulfilled' | 'cancelled', number>;

  // Wanted listing actions
  wantedStatusChangeModal: { isOpen: boolean; listing: WantedListingWithDetails | null; newStatus: WantedListingStatus | null };
  wantedDeleteModal: { isOpen: boolean; listing: WantedListingWithDetails | null };
  wantedActionLoading: boolean;
  wantedSuccessMessage: string;
  handleWantedStatusChangeRequest: (listing: WantedListingWithDetails, newStatus: WantedListingStatus) => void;
  handleWantedStatusChange: () => Promise<void>;
  handleWantedDeleteRequest: (listing: WantedListingWithDetails) => void;
  handleWantedDelete: () => Promise<void>;
  closeWantedStatusChangeModal: () => void;
  closeWantedDeleteModal: () => void;

  // Saved listings
  savedListings: ReturnType<typeof useSavedListings>['savedListings'];
  savedLoading: boolean;
  savedError: string | null;
  refetchSavedListings: () => void;
}

export function useMyListings(): UseMyListingsReturn {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('selling');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'wanted') setMainTab('wanted');
    else if (tab === 'saved') setMainTab('saved');
    else setMainTab('selling');
  }, [searchParams]);

  // Selling (regular listings) state
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<ListingStatus | 'all'>('all');

  // Wanted listings state
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
  const handleStatusChangeRequest = useCallback((listing: Listing, newStatus: ListingStatus) => {
    setStatusChangeModal({
      isOpen: true,
      listing,
      newStatus,
    });
  }, []);

  const handleStatusChange = useCallback(async () => {
    if (!statusChangeModal.listing || !statusChangeModal.newStatus) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/listings/${statusChangeModal.listing.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusChangeModal.newStatus }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
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
  }, [statusChangeModal]);

  const handleDeleteRequest = useCallback((listing: Listing) => {
    setDeleteModal({
      isOpen: true,
      listing,
    });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteModal.listing) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/listings/${deleteModal.listing.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete listing');
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
  }, [deleteModal]);

  const closeStatusChangeModal = useCallback(() => {
    setStatusChangeModal({ isOpen: false, listing: null, newStatus: null });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ isOpen: false, listing: null });
  }, []);

  // Handler functions for wanted listing actions
  const handleWantedStatusChangeRequest = useCallback((listing: WantedListingWithDetails, newStatus: WantedListingStatus) => {
    setWantedStatusChangeModal({
      isOpen: true,
      listing,
      newStatus,
    });
  }, []);

  const handleWantedStatusChange = useCallback(async () => {
    if (!wantedStatusChangeModal.listing || !wantedStatusChangeModal.newStatus) return;

    try {
      setWantedActionLoading(true);
      const response = await fetch(`/api/wanted/${wantedStatusChangeModal.listing.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: wantedStatusChangeModal.newStatus }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
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
  }, [wantedStatusChangeModal]);

  const handleWantedDeleteRequest = useCallback((listing: WantedListingWithDetails) => {
    setWantedDeleteModal({
      isOpen: true,
      listing,
    });
  }, []);

  const handleWantedDelete = useCallback(async () => {
    if (!wantedDeleteModal.listing) return;

    try {
      setWantedActionLoading(true);
      const response = await fetch(`/api/wanted/${wantedDeleteModal.listing.id}?hard=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete wanted listing');
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
  }, [wantedDeleteModal]);

  const closeWantedStatusChangeModal = useCallback(() => {
    setWantedStatusChangeModal({ isOpen: false, listing: null, newStatus: null });
  }, []);

  const closeWantedDeleteModal = useCallback(() => {
    setWantedDeleteModal({ isOpen: false, listing: null });
  }, []);

  // Filter regular listings
  const filteredListings = useMemo(() => {
    return activeTab === 'all'
      ? listings
      : listings.filter((listing) => listing.status === activeTab);
  }, [listings, activeTab]);

  const statusCounts = useMemo(() => ({
    all: listings.length,
    draft: listings.filter((l) => l.status === 'draft').length,
    active: listings.filter((l) => l.status === 'active').length,
    sold: listings.filter((l) => l.status === 'sold').length,
    removed: listings.filter((l) => l.status === 'removed').length,
  }), [listings]);

  // Filter wanted listings
  const filteredWantedListings = useMemo(() => {
    return wantedActiveTab === 'all'
      ? wantedListings
      : wantedListings.filter((listing) => listing.status === wantedActiveTab);
  }, [wantedListings, wantedActiveTab]);

  const wantedStatusCounts = useMemo(() => ({
    all: wantedListings.length,
    active: wantedListings.filter((l) => l.status === 'active').length,
    fulfilled: wantedListings.filter((l) => l.status === 'fulfilled').length,
    cancelled: wantedListings.filter((l) => l.status === 'cancelled').length,
  }), [wantedListings]);

  return {
    // Auth
    user,

    // Main tab
    mainTab,
    setMainTab,

    // Selling (regular listings)
    listings,
    loading,
    error,
    isOffline,
    activeTab,
    setActiveTab,
    filteredListings,
    statusCounts,

    // Selling listing actions
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

    // Wanted listings
    wantedListings,
    wantedLoading,
    wantedError,
    wantedIsOffline,
    wantedActiveTab,
    setWantedActiveTab,
    filteredWantedListings,
    wantedStatusCounts,

    // Wanted listing actions
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

    // Saved listings
    savedListings,
    savedLoading,
    savedError,
    refetchSavedListings,
  };
}
