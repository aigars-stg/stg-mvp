import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getTranslations } from 'next-intl/server';
import { GamePageClient } from './GamePageClient';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

interface PageProps {
  params: Promise<{ bgg_id: string; locale: string }>;
}

// Fetch game data for metadata using direct database access
async function getGameData(bggId: string) {
  try {
    const bggIdNum = parseInt(bggId);
    if (isNaN(bggIdNum)) {
      console.error('[Metadata] Invalid bggId:', bggId);
      return null;
    }

    // Check if env vars are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Metadata] Missing Supabase env vars');
      return null;
    }

    // Use simple client for metadata (no auth needed for public reads)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Fetch game metadata
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('id, name, thumbnail, image, yearpublished')
      .eq('id', bggIdNum)
      .single();

    if (gameError) {
      console.error('[Metadata] Supabase game error:', gameError.message, 'for bggId:', bggIdNum);
      return null;
    }

    if (!gameData) {
      console.error('[Metadata] No game data found for bggId:', bggIdNum);
      return null;
    }

    // Fetch active listings count and lowest price
    const { data: listings } = await supabase
      .from('listings')
      .select('price')
      .eq('bgg_game_id', bggIdNum)
      .eq('status', 'active');

    const offerCount = listings?.length || 0;
    const lowestPrice = listings && listings.length > 0
      ? Math.min(...listings.map(l => l.price))
      : 0;
    const highestPrice = listings && listings.length > 0
      ? Math.max(...listings.map(l => l.price))
      : 0;

    return {
      game_name: gameData.name,
      game_year: gameData.yearpublished,
      image: gameData.image,
      thumbnail: gameData.thumbnail,
      offer_count: offerCount,
      lowest_price: lowestPrice,
      highest_price: highestPrice,
    };
  } catch (error) {
    console.error('Error fetching game for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bgg_id, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'GameDetail.metadata' });
  const game = await getGameData(bgg_id);

  if (!game) {
    return {
      title: t('gameNotFoundTitle'),
      description: t('gameNotFoundDescription'),
    };
  }

  const title = game.game_name;
  const description = game.offer_count > 0
    ? t('buyFrom', {
        gameName: game.game_name,
        price: game.lowest_price.toFixed(2),
        count: game.offer_count,
      })
    : t('findGame', { gameName: game.game_name });

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Second Turn Games`,
      description,
      images: game.image ? [{ url: game.image, alt: game.game_name }] : undefined,
      url: `https://www.secondturn.games/game/${bgg_id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Second Turn Games`,
      description,
      images: game.image ? [game.image] : undefined,
    },
  };
}

export default async function GamePage({ params }: PageProps) {
  const { bgg_id } = await params;
  const game = await getGameData(bgg_id);

  const productJsonLd = game ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: game.game_name,
    description: `Pre-loved copy of ${game.game_name}${game.game_year ? ` (${game.game_year})` : ''} available on Second Turn Games`,
    image: game.image || undefined,
    url: `${baseUrl}/game/${bgg_id}`,
    brand: { '@type': 'Organization', name: 'Second Turn Games' },
    category: 'Board Games',
    offers: game.offer_count > 0 ? {
      '@type': 'AggregateOffer',
      lowPrice: game.lowest_price.toFixed(2),
      highPrice: game.highest_price.toFixed(2),
      priceCurrency: 'EUR',
      offerCount: game.offer_count,
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/game/${bgg_id}`,
    } : {
      '@type': 'Offer',
      availability: 'https://schema.org/OutOfStock',
      priceCurrency: 'EUR',
      price: '0',
      url: `${baseUrl}/game/${bgg_id}`,
    },
  } : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      {game && (
        <BreadcrumbSchema items={[
          { name: 'Home', url: baseUrl },
          { name: 'Browse', url: `${baseUrl}/browse` },
          { name: game.game_name, url: `${baseUrl}/game/${bgg_id}` },
        ]} />
      )}
      <GamePageClient bggId={bgg_id} />
    </>
  );
}
