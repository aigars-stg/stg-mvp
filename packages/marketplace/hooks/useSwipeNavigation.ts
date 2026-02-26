'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface UseSwipeNavigationProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled: boolean;
}

interface SwipeNavigationReturn {
  bind: () => {
    onPointerDown: (e: React.PointerEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  style: {
    transform: string;
    transition: string;
  };
  isSwiping: boolean;
}

// Lower threshold for page navigation than card discard
const COMMIT_DISTANCE = 80; // px
const COMMIT_VELOCITY = 0.5; // px/ms
const MAX_TRANSLATE = 100; // Maximum visual feedback translation

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  enabled,
}: UseSwipeNavigationProps): SwipeNavigationReturn {
  const [gestureState, setGestureState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
  });

  const prefersReducedMotion = useReducedMotion();

  const touchHistory = useRef<Array<{ x: number; timestamp: number }>>([]);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Haptic feedback helper (skip when user prefers reduced motion)
  const triggerHaptic = useCallback((duration: number) => {
    if (!prefersReducedMotion && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, [prefersReducedMotion]);

  // Calculate velocity from touch history
  const calculateVelocity = useCallback(() => {
    if (touchHistory.current.length < 2) return 0;

    const recent = touchHistory.current[touchHistory.current.length - 1];
    const previous = touchHistory.current[touchHistory.current.length - 2];

    const deltaX = recent.x - previous.x;
    const deltaTime = recent.timestamp - previous.timestamp;

    return deltaTime > 0 ? Math.abs(deltaX / deltaTime) : 0;
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) return;

      isHorizontalSwipe.current = null;
      touchHistory.current = [{ x: clientX, timestamp: Date.now() }];

      setGestureState({
        isDragging: true,
        startX: clientX,
        startY: clientY,
        deltaX: 0,
        deltaY: 0,
      });
    },
    [enabled]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!gestureState.isDragging) return;

      const deltaX = clientX - gestureState.startX;
      const deltaY = clientY - gestureState.startY;

      // Determine if this is a horizontal or vertical swipe
      if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);

        // If vertical, cancel the swipe
        if (!isHorizontalSwipe.current) {
          setGestureState((prev) => ({
            ...prev,
            isDragging: false,
            deltaX: 0,
            deltaY: 0,
          }));
          return;
        }

        // Prevent page scrolling for horizontal swipe
        document.body.style.overflow = 'hidden';
      }

      if (!isHorizontalSwipe.current) return;

      // Track position history for velocity calculation
      touchHistory.current.push({ x: clientX, timestamp: Date.now() });
      if (touchHistory.current.length > 5) touchHistory.current.shift();

      setGestureState((prev) => ({
        ...prev,
        deltaX,
        deltaY,
      }));
    },
    [gestureState.isDragging, gestureState.startX, gestureState.startY]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!gestureState.isDragging) return;

    document.body.style.overflow = '';

    // Only process if it was a horizontal swipe
    if (isHorizontalSwipe.current) {
      const distance = Math.abs(gestureState.deltaX);
      const velocity = calculateVelocity();

      // Check if swipe should commit
      const committedByDistance = distance > COMMIT_DISTANCE;
      const committedByVelocity = velocity > COMMIT_VELOCITY;

      if (committedByDistance || committedByVelocity) {
        triggerHaptic(30);

        // Swipe right = go to previous game (swipe from left edge)
        // Swipe left = go to next game (swipe from right edge)
        if (gestureState.deltaX > 0) {
          onSwipeRight();
        } else {
          onSwipeLeft();
        }
      }
    }

    // Reset state
    setGestureState({
      isDragging: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
    });

    isHorizontalSwipe.current = null;
    touchHistory.current = [];
  }, [
    gestureState.isDragging,
    gestureState.deltaX,
    calculateVelocity,
    onSwipeLeft,
    onSwipeRight,
    triggerHaptic,
  ]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.isPrimary && e.pointerType === 'touch') {
        handleDragStart(e.clientX, e.clientY);
      }
    },
    [handleDragStart]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.isPrimary) {
        handleDragMove(e.clientX, e.clientY);
      }
    },
    [handleDragMove]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.isPrimary) {
        handleDragEnd();
      }
    },
    [handleDragEnd]
  );

  // Touch event handlers (fallback)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleDragStart]
  );

  // Set up global event listeners for drag move and end
  useEffect(() => {
    if (gestureState.isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [gestureState.isDragging, handlePointerMove, handlePointerUp]);

  // Calculate visual feedback translation (capped)
  const translateX = isHorizontalSwipe.current
    ? Math.max(-MAX_TRANSLATE, Math.min(MAX_TRANSLATE, gestureState.deltaX * 0.5))
    : 0;

  return {
    bind: () => ({
      onPointerDown: handlePointerDown,
      onTouchStart: handleTouchStart,
    }),
    style: {
      transform: gestureState.isDragging && isHorizontalSwipe.current
        ? `translateX(${translateX}px)`
        : 'translateX(0)',
      transition: gestureState.isDragging || prefersReducedMotion ? 'none' : 'transform 0.3s ease-out',
    },
    isSwiping: gestureState.isDragging && isHorizontalSwipe.current === true,
  };
}
