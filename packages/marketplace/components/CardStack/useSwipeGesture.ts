import { useState, useCallback, useRef, useEffect } from 'react';
import type { SwipeDirection, GestureState } from './types';

interface UseSwipeGestureProps {
  onSwipe: (direction: 'left' | 'right') => void;
  onTap: () => void;
  index: number;
  disabled?: boolean;
}

interface SwipeGestureReturn {
  bind: () => {
    onPointerDown: (e: React.PointerEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  style: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    opacity: number;
  };
  isActive: boolean;
  isDragging: boolean;
}

const COMMIT_DISTANCE = 120; // px - distance needed to commit swipe
const COMMIT_VELOCITY = 0.6; // px/ms - velocity needed to commit swipe
const TAP_THRESHOLD_DISTANCE = 15; // px - max movement for tap
const TAP_THRESHOLD_TIME = 400; // ms - max duration for tap

export function useSwipeGesture({
  onSwipe,
  onTap,
  index,
  disabled = false,
}: UseSwipeGestureProps): SwipeGestureReturn {
  const [gestureState, setGestureState] = useState<GestureState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    rotation: 0,
    opacity: 1,
  });

  const tapStartTime = useRef(0);
  const tapStartX = useRef(0);
  const tapStartY = useRef(0);
  const touchHistory = useRef<Array<{ x: number; y: number; timestamp: number }>>([]);
  const hasVibratedRef = useRef(false);

  // Haptic feedback helper
  const triggerHaptic = useCallback((duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, []);

  // Calculate velocity from touch history
  const calculateVelocity = useCallback(() => {
    if (touchHistory.current.length < 2) return 0;

    const recent = touchHistory.current[touchHistory.current.length - 1];
    const previous = touchHistory.current[touchHistory.current.length - 2];

    const deltaX = recent.x - previous.x;
    const deltaTime = recent.timestamp - previous.timestamp;

    return Math.abs(deltaX / deltaTime); // px per ms
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled || index !== 0) return; // Only top card is draggable

      tapStartTime.current = Date.now();
      tapStartX.current = clientX;
      tapStartY.current = clientY;
      hasVibratedRef.current = false;
      touchHistory.current = [{ x: clientX, y: clientY, timestamp: Date.now() }];

      setGestureState({
        isDragging: true,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        deltaX: 0,
        deltaY: 0,
        rotation: 0,
        opacity: 1,
      });

      // Prevent page scrolling during drag
      document.body.style.overflow = 'hidden';
    },
    [disabled, index]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!gestureState.isDragging) return;

      const deltaX = clientX - gestureState.startX;
      const deltaY = clientY - gestureState.startY;

      // Track position history for velocity calculation
      touchHistory.current.push({ x: clientX, y: clientY, timestamp: Date.now() });
      if (touchHistory.current.length > 5) touchHistory.current.shift();

      // Calculate dynamic rotation based on horizontal movement
      const rotation = deltaX * 0.15;

      // Calculate opacity fade based on distance
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const opacity = Math.max(0.75, 1 - distance / 800);

      // Haptic feedback when crossing commit threshold
      if (!hasVibratedRef.current && distance > COMMIT_DISTANCE) {
        triggerHaptic(20);
        hasVibratedRef.current = true;
      }

      setGestureState((prev) => ({
        ...prev,
        currentX: clientX,
        currentY: clientY,
        deltaX,
        deltaY,
        rotation,
        opacity,
      }));
    },
    [gestureState.isDragging, gestureState.startX, gestureState.startY, triggerHaptic]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!gestureState.isDragging) return;

    // Check for tap
    const tapDuration = Date.now() - tapStartTime.current;
    const tapDistanceX = Math.abs(gestureState.currentX - tapStartX.current);
    const tapDistanceY = Math.abs(gestureState.currentY - tapStartY.current);
    const tapDistance = Math.sqrt(tapDistanceX ** 2 + tapDistanceY ** 2);

    const isTap = tapDistance < TAP_THRESHOLD_DISTANCE && tapDuration < TAP_THRESHOLD_TIME;

    if (isTap) {
      // Reset state and trigger tap
      setGestureState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
        rotation: 0,
        opacity: 1,
      });
      document.body.style.overflow = '';
      onTap();
      return;
    }

    // Calculate swipe metrics
    const distance = Math.abs(gestureState.deltaX);
    const velocity = calculateVelocity();

    // Check if swipe should commit
    const committedByDistance = distance > COMMIT_DISTANCE;
    const committedByVelocity = velocity > COMMIT_VELOCITY;

    if (committedByDistance || committedByVelocity) {
      const direction: SwipeDirection = gestureState.deltaX > 0 ? 'right' : 'left';
      triggerHaptic(40); // Medium vibration on successful swipe
      onSwipe(direction);
    }

    // Reset state (snap back if not committed)
    setGestureState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      rotation: 0,
      opacity: 1,
    });

    document.body.style.overflow = '';
    touchHistory.current = [];
  }, [
    gestureState.isDragging,
    gestureState.currentX,
    gestureState.currentY,
    gestureState.deltaX,
    calculateVelocity,
    onSwipe,
    onTap,
    triggerHaptic,
  ]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.isPrimary) {
        e.preventDefault();
        handleDragStart(e.clientX, e.clientY);
      }
    },
    [handleDragStart]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.isPrimary) {
        e.preventDefault();
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

  // Touch event handlers (fallback for browsers without pointer events)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
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

  return {
    bind: () => ({
      onPointerDown: handlePointerDown,
      onTouchStart: handleTouchStart,
    }),
    style: {
      x: gestureState.deltaX,
      y: gestureState.deltaY,
      rotation: gestureState.rotation,
      scale: gestureState.isDragging ? 1.05 : 1,
      opacity: gestureState.isDragging ? gestureState.opacity : 1,
    },
    isActive: gestureState.isDragging,
    isDragging: gestureState.isDragging,
  };
}
