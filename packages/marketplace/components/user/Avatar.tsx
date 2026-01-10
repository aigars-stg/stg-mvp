'use client';

import { User } from 'griddy-icons';
import { getInitials } from '@/lib/auth/utils';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  /** Avatar image URL */
  src: string | null | undefined;
  /** User name for alt text and initials fallback */
  name: string;
  /** Size variant */
  size?: AvatarSize;
  /** Additional className */
  className?: string;
}

const avatarSizeMap: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xs: { container: 'w-5 h-5', text: 'text-[8px]', icon: 'w-3 h-3' },
  sm: { container: 'w-7 h-7', text: 'text-xs', icon: 'w-4 h-4' },
  md: { container: 'w-9 h-9', text: 'text-sm', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', text: 'text-base', icon: 'w-6 h-6' },
  xl: { container: 'w-20 h-20', text: 'text-2xl', icon: 'w-10 h-10' },
  '2xl': { container: 'w-24 h-24', text: 'text-3xl', icon: 'w-12 h-12' },
};

/**
 * Standardized avatar component with size system.
 * Falls back to initials or generic icon when no image is available.
 */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const styles = avatarSizeMap[size];
  const initials = getInitials(name);
  const hasInitials = initials && initials !== '?';

  // Alt text: decorative when name is visible elsewhere, otherwise descriptive
  const altText = name ? `${name}'s avatar` : 'User avatar';

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center',
        'bg-frost-100',
        styles.container,
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={altText}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image, show fallback
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : hasInitials ? (
        <span
          className={cn('font-medium text-frost-700', styles.text)}
          aria-hidden="true"
        >
          {initials}
        </span>
      ) : (
        <User className={cn('text-frost-500', styles.icon)} aria-hidden="true" />
      )}
    </div>
  );
}
