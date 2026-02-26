/* eslint-disable @next/next/no-img-element -- lightbox displays user-uploaded listing photos */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusTrap } from '@second-turn/design-system';
import {  Close, ChevronLeft, ChevronRight, SearchPlus as ZoomIn, SearchMinus as ZoomOut  } from '@/lib/icons';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  gameName?: string;
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  gameName = 'Image',
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Focus trap handles: Escape key, body scroll lock, Tab boundary wrapping
  useFocusTrap(isOpen, lightboxRef, onClose);

  // Reset state when opening/closing or changing index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setZoomPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsZoomed(false);
    setZoomPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsZoomed(false);
    setZoomPosition({ x: 0, y: 0 });
  }, [images.length]);

  // Arrow key navigation (Escape handled by useFocusTrap)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrevious, handleNext]);

  // Zoom toggle
  const handleZoomToggle = () => {
    if (isZoomed) {
      setIsZoomed(false);
      setZoomPosition({ x: 50, y: 50 }); // Reset to center
    } else {
      setIsZoomed(true);
      setZoomPosition({ x: 50, y: 50 }); // Zoom from center
    }
  };

  // Mouse move for zoom panning (desktop)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
  };

  // Touch drag for zoom panning (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isZoomed) return;

    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - zoomPosition.x, y: touch.clientY - zoomPosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isZoomed || !isDragging) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    setZoomPosition({
      x: Math.max(-100, Math.min(100, newX)),
      y: Math.max(-100, Math.min(100, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Swipe navigation for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleSwipeStart = (e: React.TouchEvent) => {
    if (isZoomed) return; // Don't swipe when zoomed
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (isZoomed) return;
    // Prevent vertical scroll while horizontal swiping
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = Math.abs(touchX - touchStartX.current);
    const diffY = Math.abs(touchY - touchStartY.current);

    if (diffX > diffY && diffX > 10) {
      e.preventDefault();
    }
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (isZoomed) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // Swipe threshold: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-polar-night/95 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-snow-white/10 hover:bg-snow-white/20 flex items-center justify-center text-snow-white transition-colors"
        aria-label="Close lightbox"
      >
        <Close className="w-6 h-6" />
      </button>

      {/* Image Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-polar-night/80 text-snow-white px-4 py-2 rounded-full text-sm font-medium">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleZoomToggle}
          className="w-10 h-10 rounded-full bg-snow-white/10 hover:bg-snow-white/20 flex items-center justify-center text-snow-white transition-colors"
          aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
        >
          {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-snow-white/10 hover:bg-snow-white/20 flex items-center justify-center text-snow-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-snow-white/10 hover:bg-snow-white/20 flex items-center justify-center text-snow-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Image */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-hidden touch-none"
        onMouseMove={handleMouseMove}
        onTouchStart={isZoomed ? handleTouchStart : handleSwipeStart}
        onTouchMove={isZoomed ? handleTouchMove : handleSwipeMove}
        onTouchEnd={isZoomed ? handleTouchEnd : handleSwipeEnd}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`${gameName} - Image ${currentIndex + 1}`}
          className={`max-w-full max-h-[90vh] object-contain cursor-${isZoomed ? 'move' : 'zoom-in'} transition-transform duration-200 ${
            isZoomed ? 'scale-[2.5]' : 'scale-100'
          }`}
          style={
            isZoomed
              ? {
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                }
              : undefined
          }
          onClick={handleZoomToggle}
          draggable={false}
        />
      </div>

      {/* Loading Indicator for Next Image (Preload) */}
      {images.length > 1 && (
        <>
          <link rel="prefetch" as="image" href={images[(currentIndex + 1) % images.length]} />
          {currentIndex > 0 && (
            <link rel="prefetch" as="image" href={images[(currentIndex - 1 + images.length) % images.length]} />
          )}
        </>
      )}
    </div>
  );
}
