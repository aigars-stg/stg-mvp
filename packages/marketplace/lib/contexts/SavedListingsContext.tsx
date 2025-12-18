'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

interface SavedListingsContextType {
  savedListingIds: Set<string>;
  isLoading: boolean;
  isSaved: (listingId: string) => boolean;
  toggleSave: (listingId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SavedListingsContext = createContext<SavedListingsContextType | null>(null);

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchSavedListings = useCallback(async () => {
    if (!user) {
      setSavedListingIds(new Set());
      setHasFetched(true);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/saved-listings');
      const data = await response.json();

      if (response.ok && data.savedListings) {
        const ids = new Set<string>(
          data.savedListings.map((s: { listing_id: string }) => s.listing_id)
        );
        setSavedListingIds(ids);
      }
    } catch (error) {
      console.error('Error fetching saved listings:', error);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [user]);

  // Fetch saved listings when user changes (wait for auth to finish loading)
  useEffect(() => {
    // Wait for auth to finish loading before making API calls
    if (authLoading) return;

    if (user && !hasFetched) {
      fetchSavedListings();
    } else if (!user) {
      setSavedListingIds(new Set());
      setHasFetched(false);
    }
  }, [user, authLoading, hasFetched, fetchSavedListings]);

  const isSaved = useCallback(
    (listingId: string): boolean => {
      return savedListingIds.has(listingId);
    },
    [savedListingIds]
  );

  const toggleSave = useCallback(
    async (listingId: string): Promise<boolean> => {
      if (!user) {
        throw new Error('Must be logged in to save listings');
      }

      try {
        const response = await fetch(`/api/listings/${listingId}/save`, {
          method: 'POST',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to toggle save status');
        }

        // Update local state
        setSavedListingIds((prev) => {
          const newSet = new Set(prev);
          if (data.saved) {
            newSet.add(listingId);
          } else {
            newSet.delete(listingId);
          }
          return newSet;
        });

        return data.saved;
      } catch (error) {
        console.error('Error toggling save status:', error);
        throw error;
      }
    },
    [user]
  );

  return (
    <SavedListingsContext.Provider
      value={{
        savedListingIds,
        isLoading,
        isSaved,
        toggleSave,
        refetch: fetchSavedListings,
      }}
    >
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListingsContext() {
  const context = useContext(SavedListingsContext);
  if (!context) {
    throw new Error('useSavedListingsContext must be used within a SavedListingsProvider');
  }
  return context;
}
