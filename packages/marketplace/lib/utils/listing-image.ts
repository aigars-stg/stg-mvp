/**
 * Listing image resolution utilities.
 *
 * Single source of truth for image priority across the app:
 *   BGG version image → BGG thumbnail → user photos → single photo fallback
 */

interface ListingImageFields {
  gameImage?: string | null;
  gameThumbnail?: string | null;
  photoUrls?: string[] | null;
  photoUrl?: string | null;
}

/** Resolves the best single display image for a listing. */
export function resolveListingImage(fields: ListingImageFields): string | null {
  return (
    fields.gameImage ||
    fields.gameThumbnail ||
    fields.photoUrls?.[0] ||
    fields.photoUrl ||
    null
  );
}

/** Resolves all listing images for gallery/lightbox (BGG version image first, then user photos). */
export function resolveListingImages(fields: {
  gameImage?: string | null;
  photoUrls?: string[] | null;
}): string[] {
  return [
    ...(fields.gameImage ? [fields.gameImage] : []),
    ...(fields.photoUrls || []),
  ].filter(Boolean) as string[];
}
