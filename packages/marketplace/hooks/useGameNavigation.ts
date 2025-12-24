'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getBrowseContext,
  getNavigationInfo,
  updateBrowseContextIndex,
} from '@/lib/browse-context';

export interface UseGameNavigationReturn {
  hasPrev: boolean;
  hasNext: boolean;
  prevGameId: number | null;
  nextGameId: number | null;
  navigatePrev: () => void;
  navigateNext: () => void;
  hasContext: boolean;
  currentPosition: number;
  totalGames: number;
}

export function useGameNavigation(currentBggId: number): UseGameNavigationReturn {
  const router = useRouter();
  const [navState, setNavState] = useState<{
    hasPrev: boolean;
    hasNext: boolean;
    prevGameId: number | null;
    nextGameId: number | null;
    currentPosition: number;
    totalGames: number;
    hasContext: boolean;
  }>({
    hasPrev: false,
    hasNext: false,
    prevGameId: null,
    nextGameId: null,
    currentPosition: 0,
    totalGames: 0,
    hasContext: false,
  });

  // Load navigation state from sessionStorage
  useEffect(() => {
    const navInfo = getNavigationInfo(currentBggId);
    console.log('[GameNav] currentBggId:', currentBggId, 'navInfo:', navInfo);

    if (navInfo) {
      setNavState(navInfo);
    } else {
      setNavState({
        hasPrev: false,
        hasNext: false,
        prevGameId: null,
        nextGameId: null,
        currentPosition: 0,
        totalGames: 0,
        hasContext: false,
      });
    }
  }, [currentBggId]);

  // Prefetch adjacent pages for faster navigation
  useEffect(() => {
    if (navState.prevGameId) {
      router.prefetch(`/game/${navState.prevGameId}`);
    }
    if (navState.nextGameId) {
      router.prefetch(`/game/${navState.nextGameId}`);
    }
  }, [navState.prevGameId, navState.nextGameId, router]);

  const navigatePrev = useCallback(() => {
    if (!navState.hasPrev || !navState.prevGameId) return;

    // Update context index before navigating
    const context = getBrowseContext();
    if (context) {
      const newIndex = context.gameIds.indexOf(navState.prevGameId);
      if (newIndex !== -1) {
        updateBrowseContextIndex(newIndex);
      }
    }

    router.push(`/game/${navState.prevGameId}`);
  }, [navState.hasPrev, navState.prevGameId, router]);

  const navigateNext = useCallback(() => {
    if (!navState.hasNext || !navState.nextGameId) return;

    // Update context index before navigating
    const context = getBrowseContext();
    if (context) {
      const newIndex = context.gameIds.indexOf(navState.nextGameId);
      if (newIndex !== -1) {
        updateBrowseContextIndex(newIndex);
      }
    }

    router.push(`/game/${navState.nextGameId}`);
  }, [navState.hasNext, navState.nextGameId, router]);

  return {
    ...navState,
    navigatePrev,
    navigateNext,
  };
}
