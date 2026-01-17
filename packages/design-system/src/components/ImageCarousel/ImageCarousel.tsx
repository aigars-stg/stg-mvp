'use client';

import React, { useState, useCallback, ReactNode } from 'react';
import { clsx } from 'clsx';

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ImagePlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ============================================================================
// ImageCarousel
// ============================================================================

export interface ImageCarouselProps {
  /**
   * Array of image URLs to display.
   */
  images: string[];

  /**
   * Alt text for images.
   */
  alt: string;

  /**
   * Current image index (controlled mode).
   * If provided, the carousel becomes controlled.
   */
  currentIndex?: number;

  /**
   * Callback when current index changes.
   */
  onIndexChange?: (index: number) => void;

  /**
   * Whether to show navigation arrows.
   * @default true
   */
  showArrows?: boolean;

  /**
   * Whether to show dot indicators.
   * @default true
   */
  showDots?: boolean;

  /**
   * Whether to show image counter (e.g., "1/5").
   * @default false
   */
  showCounter?: boolean;

  /**
   * Whether to enable touch swipe navigation.
   * @default true
   */
  enableSwipe?: boolean;

  /**
   * Minimum swipe distance in pixels to trigger navigation.
   * @default 50
   */
  minSwipeDistance?: number;

  /**
   * Callback when an image is clicked.
   */
  onImageClick?: (index: number) => void;

  /**
   * Custom render function for images.
   * Useful for integrating with Next.js Image or other optimized loaders.
   * If not provided, renders a standard img element.
   */
  renderImage?: (src: string, alt: string, index: number) => ReactNode;

  /**
   * Custom placeholder to show when no images are available.
   */
  placeholder?: ReactNode;

  /**
   * Children to render as overlays on the image (badges, buttons, etc.).
   */
  children?: ReactNode;

  /**
   * Container className.
   */
  className?: string;

  /**
   * Image container className.
   */
  imageContainerClassName?: string;

  /**
   * Aspect ratio of the carousel.
   * @default '4/3'
   */
  aspectRatio?: '1/1' | '4/3' | '3/2' | '16/9' | 'auto';

  /**
   * Custom aria labels for accessibility.
   */
  ariaLabels?: {
    prevImage?: string;
    nextImage?: string;
    viewImage?: (index: number) => string;
  };
}

const aspectRatioClasses = {
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  '16/9': 'aspect-video',
  auto: '',
};

/**
 * ImageCarousel component - a touch-friendly image carousel with navigation.
 *
 * @example
 * // Basic usage
 * <ImageCarousel
 *   images={['image1.jpg', 'image2.jpg']}
 *   alt="Product images"
 * />
 *
 * @example
 * // With Next.js Image
 * <ImageCarousel
 *   images={images}
 *   alt="Product"
 *   renderImage={(src, alt) => (
 *     <Image src={src} alt={alt} fill className="object-contain" />
 *   )}
 * />
 *
 * @example
 * // With overlays
 * <ImageCarousel images={images} alt="Product">
 *   <Badge className="absolute top-2 left-2">New</Badge>
 *   <button className="absolute top-2 right-2">Save</button>
 * </ImageCarousel>
 */
export function ImageCarousel({
  images,
  alt,
  currentIndex: controlledIndex,
  onIndexChange,
  showArrows = true,
  showDots = true,
  showCounter = false,
  enableSwipe = true,
  minSwipeDistance = 50,
  onImageClick,
  renderImage,
  placeholder,
  children,
  className,
  imageContainerClassName,
  aspectRatio = '4/3',
  ariaLabels = {},
}: ImageCarouselProps) {
  // Internal state for uncontrolled mode
  const [internalIndex, setInternalIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Use controlled index if provided
  const currentImageIndex = controlledIndex ?? internalIndex;
  const hasMultipleImages = images.length > 1;

  const setCurrentImageIndex = useCallback(
    (indexOrFn: number | ((prev: number) => number)) => {
      const newIndex = typeof indexOrFn === 'function' ? indexOrFn(currentImageIndex) : indexOrFn;
      setInternalIndex(newIndex);
      onIndexChange?.(newIndex);
    },
    [currentImageIndex, onIndexChange]
  );

  const handlePrevImage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    },
    [images.length, setCurrentImageIndex]
  );

  const handleNextImage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    },
    [images.length, setCurrentImageIndex]
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
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
    },
    [touchStart, touchEnd, minSwipeDistance, images.length, setCurrentImageIndex]
  );

  const handleImageClick = useCallback(() => {
    onImageClick?.(currentImageIndex);
  }, [currentImageIndex, onImageClick]);

  const displayImage = images[currentImageIndex];

  // Default image renderer
  const defaultRenderImage = (src: string, imgAlt: string) => (
    <img
      src={src}
      alt={imgAlt}
      className="absolute inset-0 w-full h-full object-contain"
    />
  );

  return (
    <div
      className={clsx(
        'relative bg-polar-night/5 flex items-center justify-center group overflow-hidden',
        aspectRatioClasses[aspectRatio],
        className
      )}
      onTouchStart={enableSwipe && hasMultipleImages ? onTouchStart : undefined}
      onTouchMove={enableSwipe && hasMultipleImages ? onTouchMove : undefined}
      onTouchEnd={enableSwipe && hasMultipleImages ? onTouchEnd : undefined}
      onClick={onImageClick ? handleImageClick : undefined}
      role={onImageClick ? 'button' : undefined}
      tabIndex={onImageClick ? 0 : undefined}
    >
      {/* Image Container */}
      <div className={clsx('relative w-full h-full', imageContainerClassName)}>
        {displayImage ? (
          renderImage ? (
            renderImage(displayImage, alt, currentImageIndex)
          ) : (
            defaultRenderImage(displayImage, alt)
          )
        ) : (
          placeholder || (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImagePlaceholderIcon className="w-16 h-16 text-text-muted" />
            </div>
          )
        )}
      </div>

      {/* Navigation Arrows */}
      {showArrows && hasMultipleImages && (
        <>
          <button
            onClick={handlePrevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
            aria-label={ariaLabels.prevImage || 'Previous image'}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
            aria-label={ariaLabels.nextImage || 'Next image'}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {showDots && hasMultipleImages && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentImageIndex(index);
              }}
              className={clsx(
                'h-2 rounded-full transition-all',
                index === currentImageIndex
                  ? 'bg-snow-white w-6'
                  : 'bg-snow-white/50 hover:bg-snow-white/75 w-2'
              )}
              aria-label={ariaLabels.viewImage?.(index + 1) || `View image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {showCounter && images.length > 1 && (
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-polar-night/80 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium z-10">
          {currentImageIndex + 1}/{images.length}
        </div>
      )}

      {/* Overlay children (badges, save buttons, etc.) */}
      {children}
    </div>
  );
}

// ============================================================================
// CarouselDots (Standalone)
// ============================================================================

export interface CarouselDotsProps {
  /**
   * Total number of items/images.
   */
  count: number;

  /**
   * Current active index.
   */
  currentIndex: number;

  /**
   * Callback when a dot is clicked.
   */
  onIndexChange: (index: number) => void;

  /**
   * Size of the dots.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Color variant.
   * @default 'frost'
   */
  variant?: 'frost' | 'white' | 'dark';

  /**
   * Additional class names.
   */
  className?: string;

  /**
   * Custom aria label generator.
   */
  ariaLabel?: (index: number) => string;
}

const dotSizeClasses = {
  sm: { base: 'w-1.5 h-1.5', active: 'w-4' },
  md: { base: 'w-2 h-2', active: 'w-6' },
  lg: { base: 'w-2.5 h-2.5', active: 'w-8' },
};

const dotVariantClasses = {
  frost: {
    active: 'bg-frost-ice',
    inactive: 'bg-border hover:bg-text-muted',
  },
  white: {
    active: 'bg-snow-white',
    inactive: 'bg-snow-white/50 hover:bg-snow-white/75',
  },
  dark: {
    active: 'bg-polar-night',
    inactive: 'bg-polar-night/30 hover:bg-polar-night/50',
  },
};

/**
 * Standalone carousel dots indicator.
 * Useful when you need dots separate from the carousel container.
 *
 * @example
 * <CarouselDots
 *   count={images.length}
 *   currentIndex={currentIndex}
 *   onIndexChange={setCurrentIndex}
 * />
 */
export function CarouselDots({
  count,
  currentIndex,
  onIndexChange,
  size = 'md',
  variant = 'frost',
  className,
  ariaLabel,
}: CarouselDotsProps) {
  if (count <= 1) return null;

  const sizes = dotSizeClasses[size];
  const colors = dotVariantClasses[variant];

  return (
    <div className={clsx('flex justify-center gap-1.5', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onIndexChange(index)}
          className={clsx(
            'rounded-full transition-all',
            sizes.base,
            index === currentIndex
              ? clsx(sizes.active, colors.active)
              : colors.inactive
          )}
          aria-label={ariaLabel?.(index + 1) || `View item ${index + 1}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// ThumbnailStrip
// ============================================================================

export interface ThumbnailStripProps {
  /**
   * Array of image URLs.
   */
  images: string[];

  /**
   * Current active index.
   */
  currentIndex: number;

  /**
   * Callback when a thumbnail is clicked.
   */
  onIndexChange: (index: number) => void;

  /**
   * Size of the thumbnails.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional class names.
   */
  className?: string;

  /**
   * Custom render function for thumbnails.
   */
  renderThumbnail?: (src: string, index: number, isActive: boolean) => ReactNode;
}

const thumbnailSizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

/**
 * Thumbnail strip for image selection.
 *
 * @example
 * <ThumbnailStrip
 *   images={images}
 *   currentIndex={currentIndex}
 *   onIndexChange={setCurrentIndex}
 * />
 */
export function ThumbnailStrip({
  images,
  currentIndex,
  onIndexChange,
  size = 'md',
  className,
  renderThumbnail,
}: ThumbnailStripProps) {
  if (images.length <= 1) return null;

  const sizeClass = thumbnailSizeClasses[size];

  return (
    <div className={clsx('flex gap-2 overflow-x-auto py-2', className)}>
      {images.map((src, index) => (
        <button
          key={index}
          onClick={() => onIndexChange(index)}
          className={clsx(
            'flex-shrink-0 rounded-md overflow-hidden border-2 transition-all',
            sizeClass,
            index === currentIndex
              ? 'border-frost-ice ring-2 ring-frost-ice/30'
              : 'border-border hover:border-frost-ice/50'
          )}
          aria-label={`View image ${index + 1}`}
        >
          {renderThumbnail ? (
            renderThumbnail(src, index, index === currentIndex)
          ) : (
            <img
              src={src}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          )}
        </button>
      ))}
    </div>
  );
}
