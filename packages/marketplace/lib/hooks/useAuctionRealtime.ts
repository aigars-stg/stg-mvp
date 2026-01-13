'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface AuctionState {
  currentBid: number | null;
  bidCount: number;
  endsAt: string;
  wasExtended: boolean;
  isLoading: boolean;
  error: string | null;
}

interface BidEvent {
  listing_id: string;
  bid_id: string;
  amount: number;
  bid_count: number;
  ends_at: string;
  was_extended: boolean;
}

interface UseAuctionRealtimeOptions {
  listingId: string;
  initialCurrentBid: number | null;
  initialBidCount: number;
  initialEndsAt: string;
  onBidReceived?: (event: BidEvent) => void;
}

/**
 * Custom hook for subscribing to real-time auction bid updates.
 * Uses Supabase Realtime Broadcast for instant updates without RLS overhead.
 */
export function useAuctionRealtime({
  listingId,
  initialCurrentBid,
  initialBidCount,
  initialEndsAt,
  onBidReceived,
}: UseAuctionRealtimeOptions) {
  const [state, setState] = useState<AuctionState>({
    currentBid: initialCurrentBid,
    bidCount: initialBidCount,
    endsAt: initialEndsAt,
    wasExtended: false,
    isLoading: false,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onBidReceivedRef = useRef(onBidReceived);

  // Keep callback ref up to date
  useEffect(() => {
    onBidReceivedRef.current = onBidReceived;
  }, [onBidReceived]);

  // Subscribe to auction bid broadcasts
  useEffect(() => {
    if (!listingId) return;

    const channelName = `auction:${listingId}`;

    // Create a Broadcast channel for this auction
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: true, // Receive own broadcasts (for optimistic updates)
        },
      },
    });

    channel
      .on('broadcast', { event: 'bid' }, (payload) => {
        const bidEvent = payload.payload as BidEvent;

        // Update state with new bid info
        setState((prev) => ({
          ...prev,
          currentBid: bidEvent.amount,
          bidCount: bidEvent.bid_count,
          endsAt: bidEvent.ends_at,
          wasExtended: bidEvent.was_extended,
        }));

        // Call the optional callback
        onBidReceivedRef.current?.(bidEvent);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Auction] Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          setState((prev) => ({
            ...prev,
            error: 'Failed to connect to real-time updates',
          }));
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log(`[Auction] Unsubscribing from ${channelName}`);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [listingId]);

  // Function to broadcast a bid (called after successful API call)
  const broadcastBid = useCallback(
    (bidEvent: BidEvent) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'bid',
          payload: bidEvent,
        });
      }
    },
    []
  );

  // Function to manually refresh auction status from API
  const refreshStatus = useCallback(async () => {
    if (!listingId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/auctions/${listingId}/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch auction status');
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        currentBid: data.current_bid,
        bidCount: data.bid_count,
        endsAt: data.ends_at,
        wasExtended: data.was_extended,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [listingId]);

  return {
    ...state,
    broadcastBid,
    refreshStatus,
  };
}
