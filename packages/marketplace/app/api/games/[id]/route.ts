import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { fetchGameWithFallback, fetchExpansionsForGame, getExpansionCount, type BGGExpansionInfo } from '@/lib/bgg-api';
import type { BGGVersion } from '@/lib/bgg-types';
import type { Json } from '@/lib/supabase/database.types';
import { handleApiError } from '@/lib/api/error-handler';

// Extended game type with metadata fields (standalone type)
interface GameWithMetadata {
  id: number;
  name: string;
  thumbnail: string | null;
  image: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean | null;
  yearpublished: number | null;
  versions: Json | null;
  description: string | null;
  designers: Json | null;
  bayesaverage: number | null;
  alternate_names: Json | null;
  metadata_fetched_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const gameId = params.id;
  const { searchParams } = new URL(request.url);
  const includeExpansions = searchParams.get('expansions') === 'true';

  if (!gameId || isNaN(parseInt(gameId))) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  try {
    console.log(`📡 [Game Details] Fetching game ${gameId}${includeExpansions ? ' with expansions' : ''}`);

    // 1. Get basic info from database
    const { data: game, error: dbError } = await supabase
      .from('games')
      .select('*')
      .eq('id', parseInt(gameId))
      .single();

    if (dbError || !game) {
      throw new Error(`Game not found: ${dbError?.message || 'Unknown error'}`);
    }

    // Cast to our extended type with metadata fields
    const gameWithMeta = game as GameWithMetadata;

    // 2. Check if we have fresh metadata (< 30 days old)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hasFreshMetadata =
      gameWithMeta.metadata_fetched_at && new Date(gameWithMeta.metadata_fetched_at) > thirtyDaysAgo;

    if (hasFreshMetadata && gameWithMeta.versions) {
      console.log(`💾 [Game Details] Using cached metadata for ${gameWithMeta.name}`);

      // Check if cached data would trigger fallback mode
      const cachedVersions = (gameWithMeta.versions as unknown as BGGVersion[] | null) || [];
      const hasImages = gameWithMeta.image || gameWithMeta.thumbnail;
      const fallbackMode = !hasImages || cachedVersions.length === 0;

      // Fetch expansions if requested and game is not an expansion itself
      let expansions: BGGExpansionInfo[] = [];
      let expansionCount = 0;
      if (!gameWithMeta.is_expansion) {
        if (includeExpansions) {
          expansions = await fetchExpansionsForGame(parseInt(gameId));
          expansionCount = expansions.length;
        } else {
          // Just get the count (lightweight)
          expansionCount = await getExpansionCount(parseInt(gameId));
        }
      }

      return NextResponse.json({
        game,
        versions: cachedVersions,
        fallbackMode,
        reason: fallbackMode ? 'Missing images or version data' : undefined,
        expansions: includeExpansions ? expansions : undefined,
        expansionCount,
      });
    }

    // 3. Fetch fresh metadata from BGG with fallback detection
    console.log(`📡 [Game Details] Fetching fresh metadata from BGG...`);

    const { metadata: bggData, versions, fallbackMode, reason } = await fetchGameWithFallback(parseInt(gameId));

    if (!bggData) {
      console.warn(`⚠️  [Game Details] BGG fetch failed, using cached data with fallback mode`);
      return NextResponse.json({
        game,
        versions: [],
        fallbackMode: true,
        reason: 'BGG API unavailable',
      });
    }

    // 4. Update database with fresh metadata (including alternate_names, versions, bayesaverage, description, designers)
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        thumbnail: bggData.thumbnail,
        image: bggData.image,
        alternate_names: bggData.alternateNames || null,
        versions: versions.length > 0 ? (versions as unknown as Json) : null,
        bayesaverage: bggData.bayesaverage || null,
        player_count: bggData.playerCount || null,
        min_age: bggData.minAge || null,
        playing_time: bggData.playingTime || null,
        description: bggData.description || null,
        designers: bggData.designers && bggData.designers.length > 0 ? bggData.designers : null,
        metadata_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(gameId))
      .select()
      .single();

    if (updateError) {
      console.error('❌ [Game Details] Update failed:', updateError);
      // Return game with fresh BGG data merged
      return NextResponse.json({
        game: { ...game, ...bggData },
        versions,
        fallbackMode,
        reason,
      });
    }

    // Cast updated game to our extended type
    const updatedGameWithMeta = updatedGame as GameWithMetadata;
    console.log(`✅ [Game Details] Cached metadata for ${updatedGameWithMeta.name}`);

    // Fetch expansions if requested and game is not an expansion itself
    let expansions: BGGExpansionInfo[] = [];
    let expansionCount = 0;
    if (!updatedGameWithMeta.is_expansion) {
      if (includeExpansions) {
        expansions = await fetchExpansionsForGame(parseInt(gameId));
        expansionCount = expansions.length;
      } else {
        // Just get the count (lightweight)
        expansionCount = await getExpansionCount(parseInt(gameId));
      }
    }

    return NextResponse.json({
      game: updatedGame,
      versions,
      fallbackMode,
      reason,
      expansions: includeExpansions ? expansions : undefined,
      expansionCount,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Fetch game');
  }
}
