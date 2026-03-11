type BGGVersion = { id: number; image?: string | null };
type ItemWithListing = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listing?: { bgg_version_id?: number | null; game?: { image?: string | null; versions?: any } | null } | null;
  [key: string]: unknown;
};

export function resolveOrderItemImages(items: ItemWithListing[] | null) {
  return (items ?? []).map(({ listing, ...item }) => {
    let gameImage = listing?.game?.image ?? null;
    if (listing?.bgg_version_id && listing.game?.versions) {
      const version = (listing.game.versions as BGGVersion[]).find(v => v.id === listing.bgg_version_id);
      if (version?.image) gameImage = version.image;
    }
    return { ...item, game_image: gameImage };
  });
}
