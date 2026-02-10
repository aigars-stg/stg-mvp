import { NextRequest, NextResponse } from 'next/server';
import { getPuzzleNumber, getTargetGameInfo } from '@/lib/play/puzzle-service';
import { handleApiError } from '@/lib/api/error-handler';

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

/**
 * GET /api/play/reveal?puzzle=123
 *
 * Reveals the answer for a completed puzzle.
 * Only returns the answer - client should verify game is actually over.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const puzzleNumber = parseInt(searchParams.get('puzzle') || '0', 10);

    if (!puzzleNumber) {
      return NextResponse.json(
        { error: 'Missing puzzle number' },
        { status: 400 }
      );
    }

    // Validate puzzle number is not in the future
    const todaysPuzzle = getPuzzleNumber();
    if (puzzleNumber > todaysPuzzle) {
      return NextResponse.json(
        { error: 'Invalid puzzle number' },
        { status: 400 }
      );
    }

    // Get the answer
    const answer = await getTargetGameInfo(puzzleNumber);

    if (!answer) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    return handleApiError(error, 'Reveal puzzle');
  }
}
