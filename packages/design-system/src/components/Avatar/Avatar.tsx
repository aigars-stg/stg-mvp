import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Get initials from a full name for avatar display.
 * Returns first letter if single word, first + last initial for multiple words.
 */
export function getInitials(name: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Avatar size variants.
 *
 * Design philosophy:
 * - Sizes follow an exponential scale for visual hierarchy
 * - All sizes maintain readable initials text
 * - Uses frost colors for background (trust palette)
 * - Rounded corners for friendly appearance
 */
const avatarVariants = cva(
  // Base styles
  'rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-frost-ice/20',
  {
    variants: {
      size: {
        xs: 'w-5 h-5',
        sm: 'w-7 h-7',
        md: 'w-9 h-9',
        lg: 'w-12 h-12',
        xl: 'w-20 h-20',
        '2xl': 'w-24 h-24',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const textSizes: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'text-[8px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-2xl',
  '2xl': 'text-3xl',
};

const iconSizes: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-10 h-10',
  '2xl': 'w-12 h-12',
};

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof avatarVariants> {
  /**
   * Image URL for the avatar.
   * Falls back to initials or icon when null/undefined or on load error.
   */
  src?: string | null;

  /**
   * User name for:
   * - Generating initials (fallback when no image)
   * - Alt text for the image
   */
  name?: string;

  /**
   * Custom alt text override.
   * By default uses "{name}'s avatar" or "User avatar".
   */
  alt?: string;

  /**
   * Optional fallback icon to show when no image and no initials.
   * Should be a React element (typically an SVG icon component).
   * Defaults to a generic user icon SVG.
   */
  fallbackIcon?: React.ReactNode;

  /**
   * Show a status indicator dot.
   */
  status?: 'online' | 'offline' | 'away' | 'busy';

  /**
   * Add a ring/border around the avatar for selection states.
   */
  ring?: boolean;
}

/**
 * Avatar component - displays user profile images with fallbacks.
 *
 * Falls back to initials when no image is available, then to a generic icon.
 * Supports multiple sizes and optional status indicators.
 *
 * @example
 * // With image
 * <Avatar src="/user.jpg" name="John Doe" size="lg" />
 *
 * @example
 * // Without image (shows initials)
 * <Avatar name="Jane Smith" size="md" />
 *
 * @example
 * // With status indicator
 * <Avatar src="/user.jpg" name="John Doe" status="online" />
 *
 * @example
 * // With selection ring
 * <Avatar src="/user.jpg" name="John Doe" ring />
 */
export function Avatar({
  src,
  name = '',
  alt,
  size = 'md',
  fallbackIcon,
  status,
  ring,
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);
  const hasInitials = initials && initials !== '?';
  const showImage = src && !imageError;

  // Reset error state when src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const altText = alt || (name ? `${name}'s avatar` : 'User avatar');

  // Status indicator colors
  const statusColors = {
    online: 'bg-aurora-green',
    offline: 'bg-polar-nightDark',
    away: 'bg-aurora-yellow',
    busy: 'bg-aurora-red',
  };

  // Default user icon SVG
  const defaultIcon = (
    <svg
      className={clsx('text-frost-polar', iconSizes[size || 'md'])}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  return (
    <div className="relative inline-flex">
      <div
        className={clsx(
          avatarVariants({ size }),
          ring && 'ring-2 ring-frost-ice ring-offset-2',
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={altText}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : hasInitials ? (
          <span
            className={clsx('font-medium text-frost-arctic', textSizes[size || 'md'])}
            aria-hidden="true"
          >
            {initials}
          </span>
        ) : (
          fallbackIcon || defaultIcon
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-snow-white',
            statusColors[status],
            size === 'xs' && 'w-1.5 h-1.5',
            size === 'sm' && 'w-2 h-2',
            size === 'md' && 'w-2.5 h-2.5',
            size === 'lg' && 'w-3 h-3',
            size === 'xl' && 'w-4 h-4',
            size === '2xl' && 'w-5 h-5'
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

/**
 * AvatarGroup - displays a stack of overlapping avatars.
 */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum number of avatars to display.
   * Excess avatars are shown as a "+N" indicator.
   * @default 4
   */
  max?: number;

  /**
   * Size for all avatars in the group.
   * @default 'md'
   */
  size?: AvatarProps['size'];

  /**
   * Avatar children.
   */
  children: React.ReactNode;
}

/**
 * AvatarGroup - displays multiple avatars in a stack.
 *
 * @example
 * <AvatarGroup max={3}>
 *   <Avatar src="/user1.jpg" name="User 1" />
 *   <Avatar src="/user2.jpg" name="User 2" />
 *   <Avatar src="/user3.jpg" name="User 3" />
 *   <Avatar src="/user4.jpg" name="User 4" />
 * </AvatarGroup>
 */
export function AvatarGroup({
  max = 4,
  size = 'md',
  children,
  className,
  ...props
}: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const extraCount = avatars.length - max;

  return (
    <div
      className={clsx('flex -space-x-2', className)}
      {...props}
    >
      {visibleAvatars.map((child, index) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<AvatarProps>, {
              key: index,
              size,
              ring: true,
            })
          : child
      )}
      {extraCount > 0 && (
        <div
          className={clsx(
            avatarVariants({ size }),
            'bg-polar-nightLight text-snow-white font-medium ring-2 ring-snow-white',
            textSizes[size || 'md']
          )}
        >
          +{extraCount}
        </div>
      )}
    </div>
  );
}
