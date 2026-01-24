import { NextRequest, NextResponse } from 'next/server';
import {
  getPuzzleNumber,
  getGameAttributes,
  getTargetGameAttributes,
  getTargetGameInfo,
} from '@/lib/play/puzzle-service';
import { calculateFeedback } from '@/lib/play/feedback';
import type { GuessRequest, GuessResponse } from '@/lib/play/types';

/**
 * POST /api/play/guess
 *
 * Submit a guess and receive feedback.
 * The server is stateless - it just calculates feedback.
 * Client tracks remaining guesses and game state.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GuessRequest;
    const { puzzleNumber, gameId } = body;

    // Validate puzzle number matches today
    const todaysPuzzle = getPuzzleNumber();
    if (puzzleNumber !== todaysPuzzle) {
      return NextResponse.json(
        { error: 'Invalid puzzle number', expected: todaysPuzzle },
        { status: 400 }
      );
    }

    // Get guessed game attributes
    const guessedGame = await getGameAttributes(gameId);
    if (!guessedGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Get target game attributes
    const targetGame = await getTargetGameAttributes(puzzleNumber);
    if (!targetGame) {
      return NextResponse.json(
        { error: 'Target game not found' },
        { status: 500 }
      );
    }

    // Calculate feedback
    const feedback = calculateFeedback(guessedGame, targetGame);

    // Check if correct
    const correct = guessedGame.id === targetGame.id;

    // Get answer info if correct
    let answer = null;
    if (correct) {
      answer = await getTargetGameInfo(puzzleNumber);
    }

    const response: GuessResponse = {
      correct,
      guessedGame: {
        id: guessedGame.id,
        name: guessedGame.name,
        thumbnail: guessedGame.thumbnail,
      },
      feedback,
      answer,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Play API] Error processing guess:', error);
    return NextResponse.json(
      { error: 'Failed to process guess' },
      { status: 500 }
    );
  }
}
