import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

function localized(path: string) {
  const url = `${baseUrl}${path}`;
  return {
    en: url,
    lv: `${baseUrl}/lv${path}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages with priorities and change frequencies
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0, alternates: { languages: localized('') } },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9, alternates: { languages: localized('/browse') } },
    { url: `${baseUrl}/sell`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8, alternates: { languages: localized('/sell') } },
    { url: `${baseUrl}/play`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7, alternates: { languages: localized('/play') } },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6, alternates: { languages: localized('/help') } },
    { url: `${baseUrl}/help/buying`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: { languages: localized('/help/buying') } },
    { url: `${baseUrl}/help/selling`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: { languages: localized('/help/selling') } },
    { url: `${baseUrl}/help/grading`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: { languages: localized('/help/grading') } },
    { url: `${baseUrl}/help/shipping`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: { languages: localized('/help/shipping') } },
    { url: `${baseUrl}/help/wallet`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: { languages: localized('/help/wallet') } },
    { url: `${baseUrl}/help/dac7`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: { languages: localized('/help/dac7') } },
    { url: `${baseUrl}/legal`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3, alternates: { languages: localized('/legal') } },
    { url: `${baseUrl}/legal/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4, alternates: { languages: localized('/legal/terms') } },
    { url: `${baseUrl}/legal/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4, alternates: { languages: localized('/legal/privacy') } },
    { url: `${baseUrl}/legal/seller`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4, alternates: { languages: localized('/legal/seller') } },
    { url: `${baseUrl}/legal/cookies`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3, alternates: { languages: localized('/legal/cookies') } },
    { url: `${baseUrl}/legal/fees`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4, alternates: { languages: localized('/legal/fees') } },
  ];

  // Dynamic game pages from active listings
  let gameRoutes: MetadataRoute.Sitemap = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: listings } = await supabase
        .from('listings')
        .select('bgg_game_id, updated_at')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (listings && listings.length > 0) {
        // Deduplicate by bgg_game_id, keep most recent updated_at
        const gameMap = new Map<number, string>();
        for (const listing of listings) {
          if (!gameMap.has(listing.bgg_game_id)) {
            gameMap.set(listing.bgg_game_id, listing.updated_at);
          }
        }

        gameRoutes = Array.from(gameMap.entries()).map(([bggId, updatedAt]) => ({
          url: `${baseUrl}/game/${bggId}`,
          lastModified: new Date(updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: { languages: localized(`/game/${bggId}`) },
        }));
      }
    } catch (error) {
      console.error('[Sitemap] Failed to fetch game listings:', error);
    }
  }

  return [...staticRoutes, ...gameRoutes];
}
