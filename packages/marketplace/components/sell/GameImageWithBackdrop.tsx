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
  // Using a subtle gray backdrop - color extraction would require CORS from BGG
  const backdropColor = '#e5e7eb'; // gray-200

  return (
    <div
      className="w-14 h-14 sm:w-24 sm:h-24 flex-shrink-0 rounded border border-gray-200 flex items-center justify-center overflow-hidden relative"
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
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : hasError ? (
          <div className="text-xs text-gray-500 text-center px-1">No image</div>
        ) : null}
      </div>
    </div>
  );
}
