import React, { useEffect, useState } from 'react';

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
  const [dominantColor, setDominantColor] = useState<string>('#e5e7eb'); // gray-200 default
  const [imageLoaded, setImageLoaded] = useState(false);

  // Extract dominant color from image when it loads
  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      extractDominantColor(img);
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.warn(`Failed to load image for color extraction: ${src}`);
      setImageLoaded(true);
    };

    img.src = src;
  }, [src]);

  const extractDominantColor = (img: HTMLImageElement) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Draw resized image to canvas
      ctx.drawImage(img, 0, 0, 100, 100);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;

      let r = 0,
        g = 0,
        b = 0;
      let count = 0;

      // Sample every 4th pixel to average color (skip alpha)
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      // Calculate average
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Convert to hex
      const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
      setDominantColor(hex);

      console.log(`✨ Extracted dominant color: ${hex}`);
    } catch (error) {
      console.error('Color extraction failed:', error);
      // Silently fail, use default color
    }
  };

  return (
    <div
      className="w-14 h-14 sm:w-24 sm:h-24 flex-shrink-0 rounded border border-gray-200 flex items-center justify-center overflow-hidden relative"
      style={{
        backgroundColor: dominantColor,
        aspectRatio: '1 / 1'
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(135deg, ${dominantColor} 0%, rgba(0,0,0,0.2) 100%)`
        }}
      />

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {src && imageLoaded ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"
              style={{ borderTopColor: dominantColor }}
            />
          </div>
        ) : hasError ? (
          <div className="text-xs text-gray-500 text-center px-1">No image</div>
        ) : null}
      </div>
    </div>
  );
}
