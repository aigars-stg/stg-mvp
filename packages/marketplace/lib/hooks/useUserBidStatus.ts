'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

interface UserBidStatus {
  hasBid: boolean;
  userHighestBid: number | null;
  isWinning: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseUserBidStatusOptions {
  listingId: string;
  /** Current high bid amount - used to determine if user is still winning */
  currentBid: number | null;
}

/**
 * Custom hook for tracking the current user's bid status on an auction.
 * Fetches initial status and updates when currentBid changes.
 */
export function useUserBidStatus({
  listingId,
  currentBid,
}: UseUserBidStatusOptions) {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserBidStatus>({
    hasBid: false,
    userHighestBid: null,
    isWinning: false,
    isLoading: true,
    error: null,
  });

  const lastFetchedBid = useRef<number | null>(null);

  // Fetch user's bid status
  const fetchStatus = useCallback(async () => {
    if (!listingId) return;

    setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/auctions/${listingId}/user-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch bid status');
      }

      const data = await response.json();

      setStatus({
        hasBid: data.has_bid,
        userHighestBid: data.user_highest_bid,
        isWinning: data.is_winning,
        isLoading: false,
        error: null,
      });
      lastFetchedBid.current = currentBid;
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [listingId, currentBid]);

  // Initial fetch and refetch when user changes
  useEffect(() => {
    if (user) {
      fetchStatus();
    } else {
      // Reset status for logged out users
      setStatus({
        hasBid: false,
        userHighestBid: null,
        isWinning: false,
        isLoading: false,
        error: null,
      });
    }
  }, [user, fetchStatus]);

  // Refetch when currentBid changes (someone placed a new bid)
  useEffect(() => {
    // Only refetch if user has bid and bid amount changed
    if (user && status.hasBid && currentBid !== lastFetchedBid.current) {
      fetchStatus();
    }
  }, [user, status.hasBid, currentBid, fetchStatus]);

  return {
    ...status,
    refetch: fetchStatus,
  };
}
