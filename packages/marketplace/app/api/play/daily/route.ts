import { NextResponse } from 'next/server';
import { getPuzzleNumber, getTodayDateString } from '@/lib/play/puzzle-service';
import type { DailyPuzzleResponse } from '@/lib/play/types';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/play/daily
 *
 * Returns today's puzzle metadata (puzzle number and date).
 * The server is stateless - client owns the game state.
 */
export async function GET() {
  try {
    const puzzleNumber = getPuzzleNumber();
    const date = getTodayDateString();

    const response: DailyPuzzleResponse = {
      puzzleNumber,
      date,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, 'Fetch daily puzzle');
  }
}
