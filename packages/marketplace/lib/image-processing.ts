import sharp from 'sharp';

/**
 * Image processing configuration
 * Centralizes all image processing settings for consistency
 */
export const IMAGE_CONFIG = {
  /** Output format - WebP provides excellent compression with 97%+ browser support */
  outputFormat: 'webp' as const,
  /** WebP quality 0-100. 82 provides similar visual quality to JPEG 90 */
  quality: 82,
  /** Compression effort 0-6. 4 is a good balance of speed vs compression */
  effort: 4,
  /** Maximum dimension (longest edge) in pixels. Images larger than this will be resized */
  maxDimension: 2048,
  /** Maximum input file size in bytes (10MB) */
  maxInputSizeBytes: 10 * 1024 * 1024,
} as const;

/**
 * Result from image processing with metadata for logging/debugging
 */
export interface ProcessedImageResult {
  /** Processed image buffer */
  buffer: Buffer;
  /** Output format */
  format: 'webp';
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Original file size in bytes */
  originalSize: number;
  /** Processed file size in bytes */
  processedSize: number;
  /** Compression ratio (original/processed) */
  compressionRatio: number;
  /** Whether the image was resized */
  wasResized: boolean;
}

/**
 * Process an image for upload with compression and metadata stripping.
 *
 * Processing steps:
 * 1. Auto-rotate based on EXIF orientation (before stripping metadata)
 * 2. Convert to sRGB colorspace for consistent web rendering
 * 3. Resize if larger than max dimensions (preserve aspect ratio, never upscale)
 * 4. Convert to WebP format with optimal compression
 * 5. Strip ALL metadata (EXIF, XMP, IPTC, ICC profiles) for privacy
 *
 * @param inputBuffer - Raw image buffer from upload
 * @returns Processed image buffer and metadata
 */
export async function processImageForUpload(
  inputBuffer: Buffer
): Promise<ProcessedImageResult> {
  const originalSize = inputBuffer.length;

  // Create Sharp instance and get original metadata
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Determine if resize is needed (only downscale, never upscale)
  const longestEdge = Math.max(originalWidth, originalHeight);
  const needsResize = longestEdge > IMAGE_CONFIG.maxDimension;

  // Build processing pipeline
  let pipeline = image
    .rotate() // Auto-rotate based on EXIF orientation tag (must be before stripping metadata)
    .toColorspace('srgb'); // Ensure consistent web color rendering

  // Resize only if needed (never upscale)
  if (needsResize) {
    pipeline = pipeline.resize({
      width: IMAGE_CONFIG.maxDimension,
      height: IMAGE_CONFIG.maxDimension,
      fit: 'inside', // Fit within box, maintain aspect ratio
      withoutEnlargement: true, // Never upscale
    });
  }

  // Convert to WebP with quality settings and strip ALL metadata
  // NOTE: .withMetadata() with NO arguments strips ALL metadata (EXIF, XMP, IPTC, ICC)
  // This is different from .withMetadata({ exif: {} }) which only clears EXIF
  const outputBuffer = await pipeline
    .webp({
      quality: IMAGE_CONFIG.quality,
      effort: IMAGE_CONFIG.effort,
    })
    .withMetadata() // Strip ALL metadata for privacy (GPS location, camera info, timestamps, etc.)
    .toBuffer();

  // Get output metadata for the result
  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    format: 'webp',
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
    originalSize,
    processedSize: outputBuffer.length,
    compressionRatio: originalSize / outputBuffer.length,
    wasResized: needsResize,
  };
}
