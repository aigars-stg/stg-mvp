import type { Metadata } from 'next';
import { GamePageClient } from './GamePageClient';

interface PageProps {
  params: { bgg_id: string };
}

// Fetch game data for metadata
async function getGameData(bggId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';
    const response = await fetch(`${baseUrl}/api/games/${bggId}/offers`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.game;
  } catch (error) {
    console.error('Error fetching game for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const game = await getGameData(params.bgg_id);

  if (!game) {
    return {
      title: 'Game Not Found',
      description: 'This game could not be found on Second Turn Games.',
    };
  }

  const title = game.game_name;
  const description = game.offer_count > 0
    ? `Buy ${game.game_name} from €${game.lowest_price.toFixed(2)}. ${game.offer_count} offer${game.offer_count > 1 ? 's' : ''} available from sellers in the Baltics.`
    : `Find ${game.game_name} on Second Turn Games - the Baltic marketplace for pre-owned board games.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Second Turn Games`,
      description,
      images: game.image ? [{ url: game.image, alt: game.game_name }] : undefined,
      url: `https://www.secondturn.games/game/${params.bgg_id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Second Turn Games`,
      description,
      images: game.image ? [game.image] : undefined,
    },
  };
}

export default function GamePage({ params }: PageProps) {
  return <GamePageClient bggId={params.bgg_id} />;
}
