import { NextRequest, NextResponse } from 'next/server';
import * as xml2js from 'xml2js';
import { createServiceClient } from '@/lib/supabase/client';
import { createBGGHeaders } from '@/lib/bgg-config';

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
    console.log(`📡 Fetching images from BGG for ${isExpansion ? 'expansion' : 'game'} ${gameId}`);

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&type=${type}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: createBGGHeaders(),
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ BGG API returned ${response.status} for game ${gameId}`);
      return { thumbnail: null, image: null };
    }

    const xmlData = await response.text();
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);

    const thumbnail = result?.items?.item?.[0]?.thumbnail?.[0];
    const image = result?.items?.item?.[0]?.image?.[0];

    if (thumbnail || image) {
      console.log(`✅ Found images for game ${gameId} (thumbnail: ${!!thumbnail}, image: ${!!image})`);
      return { thumbnail: thumbnail || null, image: image || null };
    }

    console.warn(`⚠️ No images found in BGG data for game ${gameId}`);
    return { thumbnail: null, image: null };
  } catch (error: any) {
    console.error(`❌ Error fetching from BGG (game ${gameId}):`, error.message);
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
    console.log(`🖼️ [Thumbnail API] Fetching thumbnail for game ${gameId}`);

    // Step 1: Check cache in Supabase
    const { data: game, error: dbError } = await supabase
      .from('games')
      .select('id, thumbnail, is_expansion')
      .eq('id', gameId)
      .single();

    if (dbError) {
      console.error(`❌ [Thumbnail API] Database error:`, dbError);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // If cached, return immediately
    if (game?.thumbnail) {
      console.log(`💾 [Thumbnail API] Returning cached thumbnail for game ${gameId}`);
      return NextResponse.json({
        thumbnail: game.thumbnail,
        cached: true,
        gameId,
      });
    }

    // Step 2: Not cached, fetch from BGG (use correct type for expansions)
    console.log(`🔄 [Thumbnail API] Cache miss, fetching from BGG...`);
    const { thumbnail: thumbnailUrl, image: imageUrl } = await fetchBGGImages(gameId, game.is_expansion || false);

    if (!thumbnailUrl && !imageUrl) {
      console.warn(`⚠️ [Thumbnail API] No images available for game ${gameId}`);
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
      console.warn(`⚠️ [Thumbnail API] Failed to cache images:`, updateError);
      // Don't fail the request, just log it
    } else {
      console.log(`✅ [Thumbnail API] Cached images for game ${gameId}`);
    }

    return NextResponse.json({
      thumbnail: thumbnailUrl,
      cached: false,
      gameId,
    });
  } catch (error: any) {
    console.error('❌ [Thumbnail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thumbnail', details: error.message },
      { status: 500 }
    );
  }
}
