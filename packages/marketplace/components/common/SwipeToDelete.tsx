'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TrashAlt as Trash2 } from '@/lib/icons';

interface SwipeToDeleteProps {
  /** Child content to wrap */
  children: React.ReactNode;
  /** Callback when delete is triggered */
  onDelete: () => void;
  /** Whether delete action is in progress */
  isDeleting?: boolean;
  /** Delete button label for accessibility */
  deleteLabel?: string;
  /** Threshold in pixels to reveal delete button (default: 80) */
  threshold?: number;
  /** Minimum velocity to auto-complete delete (default: 0.5) */
  velocityThreshold?: number;
  /** Whether swipe is disabled */
  disabled?: boolean;
}

export function SwipeToDelete({
  children,
  onDelete,
  isDeleting = false,
  deleteLabel = 'Delete',
  threshold = 80,
  velocityThreshold = 0.5,
  disabled = false,
}: SwipeToDeleteProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastTranslateX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Reset when deleting completes
  useEffect(() => {
    if (!isDeleting) {
      setTranslateX(0);
      setIsRevealed(false);
      lastTranslateX.current = 0;
    }
  }, [isDeleting]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isDeleting) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [disabled, isDeleting]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || disabled || isDeleting) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX.current - currentX;
    const diffY = touchStartY.current - currentY;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current !== true) return;

    // Prevent vertical scroll during horizontal swipe
    e.preventDefault();

    // Calculate new position (only allow left swipe, with resistance)
    const baseTranslate = lastTranslateX.current;
    let newTranslate = baseTranslate - diffX;

    // Limit right swipe (can't go past 0)
    if (newTranslate > 0) {
      newTranslate = 0;
    }

    // Add resistance when swiping past threshold
    const maxSwipe = threshold + 40;
    if (newTranslate < -maxSwipe) {
      const overflow = -newTranslate - maxSwipe;
      newTranslate = -(maxSwipe + overflow * 0.3);
    }

    setTranslateX(newTranslate);
  }, [disabled, isDeleting, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || disabled || isDeleting) return;

    const duration = Date.now() - touchStartTime.current;
    const velocity = Math.abs(translateX - lastTranslateX.current) / duration;

    // Fast swipe triggers delete immediately
    if (velocity > velocityThreshold && translateX < -threshold / 2) {
      onDelete();
      return;
    }

    // Snap to revealed or hidden state
    if (translateX < -threshold / 2) {
      setTranslateX(-threshold);
      lastTranslateX.current = -threshold;
      setIsRevealed(true);
    } else {
      setTranslateX(0);
      lastTranslateX.current = 0;
      setIsRevealed(false);
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalSwipe.current = null;
    setIsSwiping(false);
  }, [disabled, isDeleting, translateX, threshold, velocityThreshold, onDelete]);

  const handleDelete = useCallback(() => {
    if (isDeleting) return;
    onDelete();
  }, [isDeleting, onDelete]);

  // Close on click outside when revealed
  useEffect(() => {
    if (!isRevealed) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTranslateX(0);
        lastTranslateX.current = 0;
        setIsRevealed(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isRevealed]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Delete button background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-aurora-red"
        style={{ width: `${threshold}px` }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex flex-col items-center justify-center gap-1 text-snow-white px-4 py-2 disabled:opacity-50"
          aria-label={deleteLabel}
        >
          <Trash2 className={`w-5 h-5 ${isDeleting ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-medium">{deleteLabel}</span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className="relative bg-bg"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
