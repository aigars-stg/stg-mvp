import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPuzzleNumber } from '@/lib/play/puzzle-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CompleteRequest {
  puzzleNumber: number;
  visitorId: string;
  status: 'won' | 'lost';
  guessCount: number;
  completedAt: string;
  userId?: string | null;
}

/**
 * POST /api/play/complete
 *
 * Track a completed game play for analytics.
 * Called when a game ends (win or loss).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CompleteRequest;
    const { puzzleNumber, visitorId, status, guessCount, completedAt, userId } = body;

    // Validate required fields
    if (!puzzleNumber || !visitorId || !status || !guessCount || !completedAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Validate status
    if (status !== 'won' && status !== 'lost') {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Validate guess count
    if (guessCount < 1 || guessCount > 6) {
      return NextResponse.json(
        { error: 'Invalid guess count' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role (bypass RLS for insert)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() {
            return undefined;
          },
        },
      }
    );

    // Insert completion record (upsert to handle duplicates gracefully)
    const { error } = await supabase
      .from('play_completions')
      .upsert(
        {
          puzzle_number: puzzleNumber,
          visitor_id: visitorId,
          user_id: userId || null,
          status,
          guess_count: guessCount,
          completed_at: completedAt,
        },
        {
          onConflict: 'puzzle_number,visitor_id',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      console.error('[Play API] Error tracking completion:', error);
      // Don't fail the request - tracking is non-critical
      return NextResponse.json({ success: false, error: 'Failed to track' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Play API] Error in complete endpoint:', error);
    // Don't fail the request - tracking is non-critical
    return NextResponse.json({ success: false, error: 'Internal error' });
  }
}
