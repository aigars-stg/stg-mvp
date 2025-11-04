import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { fetchGameWithFallback } from '@/lib/bgg-api';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const gameId = params.id;

  if (!gameId || isNaN(parseInt(gameId))) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  try {
    console.log(`📡 [Game Details] Fetching game ${gameId}`);

    // 1. Get basic info from database
    const { data: game, error: dbError } = await (supabase as any)
      .from('games')
      .select('*')
      .eq('id', parseInt(gameId))
      .single();

    if (dbError || !game) {
      console.error('❌ [Game Details] Database error:', dbError);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Check if we have fresh metadata (< 30 days old)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hasFreshMetadata =
      (game as any).metadata_fetched_at && new Date((game as any).metadata_fetched_at) > thirtyDaysAgo;

    if (hasFreshMetadata && (game as any).versions) {
      console.log(`💾 [Game Details] Using cached metadata for ${(game as any).name}`);

      // Check if cached data would trigger fallback mode
      const cachedVersions = (game as any).versions || [];
      const hasImages = (game as any).image || (game as any).thumbnail;
      const fallbackMode = !hasImages || cachedVersions.length === 0;

      return NextResponse.json({
        game,
        versions: cachedVersions,
        fallbackMode,
        reason: fallbackMode ? 'Missing images or version data' : undefined,
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

    // 4. Update database with fresh metadata (including alternate_names, versions, and bayesaverage)
    const { data: updatedGame, error: updateError } = await (supabase as any)
      .from('games')
      .update({
        thumbnail: bggData.thumbnail,
        image: bggData.image,
        alternate_names: bggData.alternateNames || null,
        versions: versions.length > 0 ? versions : null,
        bayesaverage: bggData.bayesaverage || null,
        player_count: bggData.playerCount || null,
        min_age: bggData.minAge || null,
        playing_time: bggData.playingTime || null,
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

    console.log(`✅ [Game Details] Cached metadata for ${(updatedGame as any).name}`);
    return NextResponse.json({
      game: updatedGame,
      versions,
      fallbackMode,
      reason,
    });
  } catch (error: any) {
    console.error('❌ [Game Details] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game details', details: error.message },
      { status: 500 }
    );
  }
}
