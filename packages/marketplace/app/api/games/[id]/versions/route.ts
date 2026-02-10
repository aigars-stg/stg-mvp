import { NextRequest, NextResponse } from 'next/server';
import { getGameVersions } from '@/lib/bgg-api';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/games/[id]/versions
 * Fetches all versions/editions of a game from BGG API
 *
 * This is a server-side route that keeps the BGG API token secure.
 * Client components should call this route instead of BGG API directly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gameId = parseInt(params.id);

  if (isNaN(gameId)) {
    return NextResponse.json(
      { error: 'Invalid game ID' },
      { status: 400 }
    );
  }

  try {
    console.log(`📡 [Versions API] Fetching versions for game ${gameId}`);

    const versions = await getGameVersions(gameId);

    console.log(`✅ [Versions API] Found ${versions.length} versions for game ${gameId}`);

    return NextResponse.json({
      versions,
      count: versions.length,
      gameId,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Fetch versions');
  }
}
