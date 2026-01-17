import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Skeleton variants for loading states.
 *
 * Design philosophy:
 * - Uses subtle polar.night opacity for light backgrounds
 * - Pulse animation for visual feedback
 * - Multiple variants for different use cases (text, image, avatar)
 * - Composable for building complex skeleton layouts
 */
const skeletonVariants = cva(
  // Base styles - subtle gray with pulse animation
  'animate-pulse bg-polar-night/10',
  {
    variants: {
      variant: {
        // Default rectangular shape
        default: 'rounded-md',
        // Circular for avatars
        circular: 'rounded-full',
        // Text-like with smaller height
        text: 'rounded h-4',
        // Image placeholder with gradient
        image: 'rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /**
   * Width of the skeleton. Can be a number (pixels) or string (any CSS value).
   * @default '100%'
   */
  width?: number | string;

  /**
   * Height of the skeleton. Can be a number (pixels) or string (any CSS value).
   * @default undefined (auto-sized based on variant)
   */
  height?: number | string;
}

/**
 * Skeleton component - loading placeholder for content.
 *
 * Use this component to show a loading state while content is being fetched.
 * Compose multiple Skeleton components to match your content layout.
 *
 * @example
 * // Simple text skeleton
 * <Skeleton variant="text" width="60%" />
 *
 * @example
 * // Avatar skeleton
 * <Skeleton variant="circular" width={48} height={48} />
 *
 * @example
 * // Image skeleton
 * <Skeleton variant="image" width="100%" height={200} />
 *
 * @example
 * // Card skeleton composition
 * <div className="space-y-3">
 *   <Skeleton variant="image" height={150} />
 *   <Skeleton variant="text" width="80%" />
 *   <Skeleton variant="text" width="60%" />
 * </div>
 */
export function Skeleton({
  variant,
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  const widthValue = typeof width === 'number' ? `${width}px` : width;
  const heightValue = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx(skeletonVariants({ variant }), className)}
      style={{
        width: widthValue,
        height: heightValue,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * SkeletonText - convenience component for text placeholders.
 * Renders multiple lines of skeleton text.
 */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'variant' | 'height'> {
  /**
   * Number of lines to render.
   * @default 3
   */
  lines?: number;

  /**
   * Gap between lines in pixels.
   * @default 8
   */
  gap?: number;

  /**
   * If true, the last line will be shorter (60% width).
   * @default true
   */
  lastLineShort?: boolean;
}

/**
 * SkeletonText - renders multiple lines of skeleton text.
 *
 * @example
 * <SkeletonText lines={3} />
 */
export function SkeletonText({
  lines = 3,
  gap = 8,
  lastLineShort = true,
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div className={clsx('space-y-2', className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={lastLineShort && i === lines - 1 ? '60%' : '100%'}
          {...props}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar - convenience component for avatar placeholders.
 */
export interface SkeletonAvatarProps extends Omit<SkeletonProps, 'variant' | 'width' | 'height'> {
  /**
   * Size of the avatar skeleton.
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

/**
 * SkeletonAvatar - circular skeleton for avatar placeholders.
 *
 * @example
 * <SkeletonAvatar size="lg" />
 */
export function SkeletonAvatar({
  size = 'md',
  ...props
}: SkeletonAvatarProps) {
  const dimension = avatarSizes[size];

  return (
    <Skeleton
      variant="circular"
      width={dimension}
      height={dimension}
      {...props}
    />
  );
}
