import Image from 'next/image';
import { Package } from '@/lib/icons';

const sizeMap = {
  xs: { container: 'w-8 h-8', icon: 'w-4 h-4', sizes: '32px', padding: 'p-0.5' },
  sm: { container: 'w-12 h-12', icon: 'w-5 h-5', sizes: '48px', padding: 'p-1' },
  md: { container: 'w-16 h-16', icon: 'w-6 h-6', sizes: '64px', padding: 'p-1' },
  lg: { container: 'w-20 h-20', icon: 'w-8 h-8', sizes: '80px', padding: 'p-1' },
  xl: { container: 'w-[100px] h-[100px]', icon: 'w-10 h-10', sizes: '100px', padding: 'p-2' },
} as const;

interface ListingThumbnailProps {
  src: string | null | undefined;
  alt: string;
  size?: keyof typeof sizeMap;
  imageCount?: number;
  onClick?: () => void;
  className?: string;
  objectFit?: 'contain' | 'cover';
}

export function ListingThumbnail({
  src,
  alt,
  size = 'md',
  imageCount,
  onClick,
  className = '',
  objectFit = 'contain',
}: ListingThumbnailProps) {
  const { container, icon, sizes, padding } = sizeMap[size];

  const content = (
    <div
      className={`relative rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden ${container} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={`${objectFit === 'cover' ? 'object-cover' : 'object-contain'} ${padding}`}
          sizes={sizes}
          unoptimized
        />
      ) : (
        <Package className={`${icon} text-text-muted`} />
      )}
      {imageCount != null && imageCount > 1 && (
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-polar-night/80 backdrop-blur-sm rounded text-[10px] text-snow-white font-medium z-10">
          {imageCount}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="flex-shrink-0 cursor-pointer">
        {content}
      </button>
    );
  }

  return <div className="flex-shrink-0">{content}</div>;
}
