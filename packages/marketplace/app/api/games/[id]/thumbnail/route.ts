import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { createServiceClient } from '@/lib/supabase/client';
import { createBGGHeaders } from '@/lib/bgg-config';
import { handleApiError } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

const BGG_API_DELAY = 100; // 100ms delay between BGG requests (rate limit friendly)
let lastBGGRequestTime = 0;

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBGGImages(gameId: number, isExpansion: boolean): Promise<{ thumbnail: string | null; image: string | null }> {
  try {
    // Rate limiting: wait if needed
    const timeSinceLastRequest = Date.now() - lastBGGRequestTime;
    if (timeSinceLastRequest < BGG_API_DELAY) {
      await delay(BGG_API_DELAY - timeSinceLastRequest);
    }
    lastBGGRequestTime = Date.now();

    const type = isExpansion ? 'boardgameexpansion' : 'boardgame';
    logger.debug({ gameId, isExpansion }, 'Fetching images from BGG');

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&type=${type}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: createBGGHeaders(),
      }
    );

    if (!response.ok) {
      logger.warn({ gameId, status: response.status }, 'BGG API error');
      return { thumbnail: null, image: null };
    }

    const xmlData = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xmlData);

    const thumbnail = result?.items?.item?.thumbnail;
    const image = result?.items?.item?.image;

    if (thumbnail || image) {
      logger.debug({ gameId, hasThumbnail: !!thumbnail, hasImage: !!image }, 'Found images');
      return { thumbnail: thumbnail || null, image: image || null };
    }

    logger.warn({ gameId }, 'No images found in BGG data');
    return { thumbnail: null, image: null };
  } catch (error: unknown) {
    logger.error({ gameId, error }, 'Error fetching from BGG');
    return { thumbnail: null, image: null };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gameId = parseInt(params.id);

  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    logger.debug({ gameId }, 'Fetching thumbnail');

    // Step 1: Check cache in Supabase
    const { data: game, error: dbError } = await supabase
      .from('games')
      .select('id, thumbnail, is_expansion')
      .eq('id', gameId)
      .single();

    if (dbError) {
      throw new Error(`Game not found: ${dbError.message}`);
    }

    // If cached, return immediately
    if (game?.thumbnail) {
      logger.debug({ gameId }, 'Returning cached thumbnail');
      return NextResponse.json({
        thumbnail: game.thumbnail,
        cached: true,
        gameId,
      });
    }

    // Step 2: Not cached, fetch from BGG (use correct type for expansions)
    logger.debug({ gameId }, 'Cache miss, fetching from BGG');
    const { thumbnail: thumbnailUrl, image: imageUrl } = await fetchBGGImages(gameId, game.is_expansion || false);

    if (!thumbnailUrl && !imageUrl) {
      logger.warn({ gameId }, 'No images available');
      return NextResponse.json({
        thumbnail: null,
        cached: false,
        gameId,
        message: 'No images available',
      });
    }

    // Step 3: Save both thumbnail AND full image to cache for future users
    const { error: updateError } = await supabase
      .from('games')
      .update({
        thumbnail: thumbnailUrl,
        image: imageUrl,
      })
      .eq('id', gameId);

    if (updateError) {
      logger.warn({ gameId, error: updateError }, 'Failed to cache images');
      // Don't fail the request, just log it
    } else {
      logger.info({ gameId }, 'Cached images');
    }

    return NextResponse.json({
      thumbnail: thumbnailUrl,
      cached: false,
      gameId,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Fetch thumbnail');
  }
}
