import type { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GamePageClient } from './GamePageClient';

interface PageProps {
  params: { bgg_id: string };
}

// Fetch game data for metadata using direct database access
async function getGameData(bggId: string) {
  try {
    const bggIdNum = parseInt(bggId);
    if (isNaN(bggIdNum)) {
      return null;
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Fetch game metadata
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('id, name, thumbnail, image, yearpublished')
      .eq('id', bggIdNum)
      .single();

    if (gameError || !gameData) {
      console.error('Error fetching game metadata:', gameError);
      return null;
    }

    // Fetch active listings count and lowest price
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('price')
      .eq('bgg_game_id', bggIdNum)
      .eq('status', 'active');

    const offerCount = listings?.length || 0;
    const lowestPrice = listings && listings.length > 0
      ? Math.min(...listings.map(l => l.price))
      : 0;

    return {
      game_name: gameData.name,
      game_year: gameData.yearpublished,
      image: gameData.image,
      thumbnail: gameData.thumbnail,
      offer_count: offerCount,
      lowest_price: lowestPrice,
    };
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
