'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface GameImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * GameImage component with automatic fallback to placeholder
 *
 * Used throughout the app to display game images with graceful handling
 * of missing or broken images.
 */
export function GameImage({ src, alt, className, size = 'md' }: GameImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!!src);

  // Show placeholder if no src, error, or loading failed
  if (!src || error) {
    return (
      <div
        className={`
          bg-bg-secondary border border-border
          rounded flex items-center justify-center
          ${sizeClasses[size]}
          ${className || ''}
        `}
      >
        <ImageIcon className={`${iconSizes[size]} text-text-muted`} />
      </div>
    );
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded
        ${sizeClasses[size]}
        ${className || ''}
      `}
    >
      {loading && (
        <div className="absolute inset-0 bg-bg-secondary border border-border flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-frost-ice" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
