import React from 'react';

interface GameImageWithBackdropProps {
  src: string | null;
  alt: string;
  isLoading: boolean;
  hasError: boolean;
}

export function GameImageWithBackdrop({
  src,
  alt,
  isLoading,
  hasError
}: GameImageWithBackdropProps) {
  // Using a subtle backdrop from design system - color extraction would require CORS from BGG
  const backdropColor = '#E5E9F0'; // snow.stormLight

  return (
    <div
      className="w-14 h-14 sm:w-24 sm:h-24 flex-shrink-0 rounded border border-snow-storm flex items-center justify-center overflow-hidden relative"
      style={{
        backgroundColor: backdropColor,
        aspectRatio: '1 / 1'
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(135deg, ${backdropColor} 0%, rgba(0,0,0,0.2) 100%)`
        }}
      />

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- external BGG image URLs
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-snow-storm border-t-polar-nightDark rounded-full animate-spin" />
          </div>
        ) : hasError ? (
          <div className="text-xs text-text-muted text-center px-1">No image</div>
        ) : null}
      </div>
    </div>
  );
}
