'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Package, ChevronLeft, ChevronRight } from '@/lib/icons';

interface ImageCarouselProps {
  /** Array of image URLs to display */
  images: string[];
  /** Alt text for images */
  alt: string;
  /** Whether to show navigation arrows on hover (default: true) */
  showArrows?: boolean;
  /** Whether to show dot indicators (default: true) */
  showDots?: boolean;
  /** Whether to show image counter (e.g., "1/5") (default: false) */
  showCounter?: boolean;
  /** Whether to enable touch swipe navigation (default: true) */
  enableSwipe?: boolean;
  /** Minimum swipe distance in pixels to trigger navigation (default: 50) */
  minSwipeDistance?: number;
  /** Container className for the image section */
  containerClassName?: string;
  /** Image className */
  imageClassName?: string;
  /** Image sizes attribute for responsive loading */
  imageSizes?: string;
  /** Placeholder icon when no images available */
  placeholderIcon?: React.ReactNode;
  /** Callback when image is clicked */
  onImageClick?: (index: number) => void;
  /** Callback when current index changes */
  onIndexChange?: (index: number) => void;
  /** Children to render as overlays on the image (badges, buttons, etc.) */
  children?: React.ReactNode;
  /** Current image index (controlled mode) */
  currentIndex?: number;
  /** Whether to set priority on the image (use for above-the-fold / LCP images) */
  priority?: boolean;
  /** Translation function for aria labels */
  ariaLabels?: {
    prevImage?: string;
    nextImage?: string;
    viewImage?: (index: number) => string;
  };
}

export function ImageCarousel({
  images,
  alt,
  showArrows = true,
  showDots = true,
  showCounter = false,
  enableSwipe = true,
  minSwipeDistance = 50,
  containerClassName = 'relative h-40 sm:h-44 lg:h-48 bg-polar-night/5 flex items-center justify-center group overflow-hidden',
  imageClassName = 'object-contain p-4',
  imageSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  placeholderIcon,
  onImageClick,
  onIndexChange,
  children,
  currentIndex: controlledIndex,
  ariaLabels = {},
  priority = false,
}: ImageCarouselProps) {
  // Internal state for uncontrolled mode
  const [internalIndex, setInternalIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Use controlled index if provided, otherwise use internal state
  const currentImageIndex = controlledIndex ?? internalIndex;
  const hasMultipleImages = images.length > 1;

  const setCurrentImageIndex = useCallback((indexOrFn: number | ((prev: number) => number)) => {
    const newIndex = typeof indexOrFn === 'function' ? indexOrFn(currentImageIndex) : indexOrFn;
    setInternalIndex(newIndex);
    onIndexChange?.(newIndex);
  }, [currentImageIndex, onIndexChange]);

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length, setCurrentImageIndex]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length, setCurrentImageIndex]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    } else if (isRightSwipe) {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  }, [touchStart, touchEnd, minSwipeDistance, images.length, setCurrentImageIndex]);

  const handleImageClick = useCallback(() => {
    onImageClick?.(currentImageIndex);
  }, [currentImageIndex, onImageClick]);

  const displayImage = images[currentImageIndex];

  return (
    <div
      className={containerClassName}
      onTouchStart={enableSwipe && hasMultipleImages ? onTouchStart : undefined}
      onTouchMove={enableSwipe && hasMultipleImages ? onTouchMove : undefined}
      onTouchEnd={enableSwipe && hasMultipleImages ? onTouchEnd : undefined}
      onClick={onImageClick ? handleImageClick : undefined}
      role={onImageClick ? 'button' : undefined}
      tabIndex={onImageClick ? 0 : undefined}
    >
      {displayImage ? (
        <Image
          src={displayImage}
          alt={alt}
          fill
          className={imageClassName}
          sizes={imageSizes}
          priority={priority}
          unoptimized={displayImage.startsWith('http')}
        />
      ) : (
        placeholderIcon || <Package className="w-16 h-16 text-text-muted" />
      )}

      {/* Navigation Arrows */}
      {showArrows && hasMultipleImages && (
        <>
          <button
            onClick={handlePrevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            aria-label={ariaLabels.prevImage || 'Previous image'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            aria-label={ariaLabels.nextImage || 'Next image'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {showDots && hasMultipleImages && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentImageIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImageIndex
                  ? 'bg-snow-white w-6'
                  : 'bg-snow-white/50 hover:bg-snow-white/75'
              }`}
              aria-label={ariaLabels.viewImage?.(index + 1) || `View image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {showCounter && images.length > 1 && (
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-polar-night/80 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium">
          {currentImageIndex + 1}/{images.length}
        </div>
      )}

      {/* Overlay children (badges, save buttons, etc.) */}
      {children}
    </div>
  );
}

/**
 * Simplified dot-only carousel for compact layouts (like OfferCard desktop)
 */
interface DotCarouselProps {
  /** Array of image URLs */
  images: string[];
  /** Alt text for images */
  alt: string;
  /** Current image index */
  currentIndex: number;
  /** Callback when index changes */
  onIndexChange: (index: number) => void;
  /** Container className */
  containerClassName?: string;
  /** Dot container className */
  dotContainerClassName?: string;
  /** Active dot className */
  activeDotClassName?: string;
  /** Inactive dot className */
  inactiveDotClassName?: string;
  /** Translation function for aria labels */
  ariaLabel?: (index: number) => string;
}

export function DotCarousel({
  images,
  currentIndex,
  onIndexChange,
  dotContainerClassName = 'flex justify-center gap-1.5',
  activeDotClassName = 'bg-frost-ice scale-110',
  inactiveDotClassName = 'bg-border hover:bg-text-muted',
  ariaLabel,
}: DotCarouselProps) {
  if (images.length <= 1) return null;

  return (
    <div className={dotContainerClassName}>
      {images.map((_, index) => (
        <button
          key={index}
          onClick={() => onIndexChange(index)}
          className={`w-2 h-2 rounded-full transition-all ${
            index === currentIndex ? activeDotClassName : inactiveDotClassName
          }`}
          aria-label={ariaLabel?.(index + 1) || `View image ${index + 1}`}
        />
      ))}
    </div>
  );
}
