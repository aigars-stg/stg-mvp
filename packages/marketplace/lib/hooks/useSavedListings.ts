'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { SavedListingWithDetails } from '../types/listing';

interface UseSavedListingsReturn {
  savedListings: SavedListingWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isSaved: (listingId: string) => boolean;
  toggleSave: (listingId: string) => Promise<boolean>;
  removeSaved: (savedListingId: string) => Promise<void>;
}

export function useSavedListings(): UseSavedListingsReturn {
  const { user, loading: authLoading } = useAuth();
  const [savedListings, setSavedListings] = useState<SavedListingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedListings = useCallback(async () => {
    if (!user) {
      setSavedListings([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/saved-listings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch saved listings');
      }

      setSavedListings(data.savedListings || []);
    } catch (err: any) {
      console.error('Error fetching saved listings:', err);
      setError(err.message);
      setSavedListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Wait for auth to finish loading before fetching
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchSavedListings();
    } else {
      setSavedListings([]);
      setIsLoading(false);
    }
  }, [user, authLoading, fetchSavedListings]);

  const isSaved = useCallback(
    (listingId: string): boolean => {
      return savedListings.some((saved) => saved.listing_id === listingId);
    },
    [savedListings]
  );

  const toggleSave = useCallback(
    async (listingId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/listings/${listingId}/save`, {
          method: 'POST',
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to toggle save status');
        }

        // Optimistically update the UI
        if (data.saved) {
          // Fetch the full listing details for the newly saved item
          await fetchSavedListings();
        } else {
          // Remove from saved listings
          setSavedListings((prev) =>
            prev.filter((saved) => saved.listing_id !== listingId)
          );
        }

        return data.saved;
      } catch (err: any) {
        console.error('Error toggling save status:', err);
        setError(err.message);
        throw err;
      }
    },
    [fetchSavedListings]
  );

  const removeSaved = useCallback(
    async (savedListingId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/saved-listings/${savedListingId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove saved listing');
        }

        // Optimistically update the UI
        setSavedListings((prev) =>
          prev.filter((saved) => saved.id !== savedListingId)
        );
      } catch (err: any) {
        console.error('Error removing saved listing:', err);
        setError(err.message);
        throw err;
      }
    },
    []
  );

  return {
    savedListings,
    isLoading,
    error,
    refetch: fetchSavedListings,
    isSaved,
    toggleSave,
    removeSaved,
  };
}

/**
 * Hook to check if a specific listing is saved
 * Lighter weight than useSavedListings for individual listing pages
 */
export function useIsListingSaved(listingId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!listingId || !user) {
      setIsSaved(false);
      setIsLoading(false);
      return;
    }

    const checkSaveStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/listings/${listingId}/save`);
        const data = await response.json();
        setIsSaved(data.saved || false);
      } catch (err) {
        console.error('Error checking save status:', err);
        setIsSaved(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSaveStatus();
  }, [listingId, user, authLoading]);

  const toggleSave = useCallback(async () => {
    if (!listingId) return false;

    try {
      const response = await fetch(`/api/listings/${listingId}/save`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle save status');
      }

      setIsSaved(data.saved);
      return data.saved;
    } catch (err: any) {
      console.error('Error toggling save status:', err);
      throw err;
    }
  }, [listingId]);

  return {
    isSaved,
    isLoading,
    toggleSave,
  };
}
