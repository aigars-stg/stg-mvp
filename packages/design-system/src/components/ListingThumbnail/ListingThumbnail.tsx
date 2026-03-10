import { clsx } from 'clsx';

const sizeMap = {
  xs: { container: 'w-8 h-8', icon: 'w-4 h-4', padding: 'p-0.5' },
  sm: { container: 'w-12 h-12', icon: 'w-5 h-5', padding: 'p-1' },
  md: { container: 'w-16 h-16', icon: 'w-6 h-6', padding: 'p-1' },
  lg: { container: 'w-20 h-20', icon: 'w-8 h-8', padding: 'p-1' },
  xl: { container: 'w-[100px] h-[100px]', icon: 'w-10 h-10', padding: 'p-2' },
} as const;

export interface ListingThumbnailProps {
  src: string | null | undefined;
  alt: string;
  size?: keyof typeof sizeMap;
  imageCount?: number;
  onClick?: () => void;
  className?: string;
  objectFit?: 'contain' | 'cover';
}

// Inline Package icon — no external icon library dependency
function PackageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
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
  const { container, icon, padding } = sizeMap[size];

  const content = (
    <div
      className={clsx(
        'relative rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden',
        container,
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={clsx(
            'absolute inset-0 w-full h-full',
            objectFit === 'cover' ? 'object-cover' : 'object-contain',
            padding
          )}
        />
      ) : (
        <PackageIcon className={clsx(icon, 'text-text-muted')} />
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
