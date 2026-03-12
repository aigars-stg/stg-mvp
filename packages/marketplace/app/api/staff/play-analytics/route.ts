import { NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/play-analytics
 *
 * Staff-only endpoint to get Galda Spēle game analytics.
 * Returns:
 * - Summary stats (plays today/week/month, win rate, avg guesses, unique players)
 * - Daily trend data (last 30 days)
 * - Per-puzzle performance data
 */
export async function GET() {
  try {
    const { response, serviceClient } = await requireStaffAuth();
    if (response) return response;

    // Get current date info for filtering
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);

    // Fetch all completions from the last 30 days
    const { data: completions, error: completionsError } = await serviceClient
      .from('play_completions')
      .select('*')
      .gte('completed_at', monthStart.toISOString())
      .order('completed_at', { ascending: false });

    if (completionsError) {
      return handleApiError(completionsError, 'Fetch play completions');
    }

    const allCompletions = completions || [];

    // Calculate summary stats
    const todayCompletions = allCompletions.filter(
      (c) => new Date(c.completed_at) >= todayStart
    );
    const weekCompletions = allCompletions.filter(
      (c) => new Date(c.completed_at) >= weekStart
    );

    const playsToday = todayCompletions.length;
    const playsThisWeek = weekCompletions.length;
    const playsThisMonth = allCompletions.length;

    const wins = allCompletions.filter((c) => c.status === 'won');
    const winRate = allCompletions.length > 0
      ? Math.round((wins.length / allCompletions.length) * 100)
      : 0;

    const avgGuesses = wins.length > 0
      ? Math.round(
          (wins.reduce((sum, c) => sum + c.guess_count, 0) / wins.length) * 10
        ) / 10
      : 0;

    // Unique visitors
    const uniqueVisitorsToday = new Set(todayCompletions.map((c) => c.visitor_id)).size;
    const uniqueVisitorsWeek = new Set(weekCompletions.map((c) => c.visitor_id)).size;
    const uniqueVisitorsMonth = new Set(allCompletions.map((c) => c.visitor_id)).size;

    // Calculate daily trends (last 30 days)
    const dailyTrends: Array<{
      date: string;
      plays: number;
      wins: number;
      uniquePlayers: number;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayCompletions = allCompletions.filter((c) => {
        const completedAt = new Date(c.completed_at);
        return completedAt >= date && completedAt < nextDate;
      });

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        plays: dayCompletions.length,
        wins: dayCompletions.filter((c) => c.status === 'won').length,
        uniquePlayers: new Set(dayCompletions.map((c) => c.visitor_id)).size,
      });
    }

    // Get puzzle performance data (fetch puzzles with game names)
    const puzzleNumbers = [...new Set(allCompletions.map((c) => c.puzzle_number))];

    const { data: puzzles, error: puzzlesError } = await serviceClient
      .from('play_daily_puzzles')
      .select(`
        puzzle_number,
        game_id,
        games!inner(name)
      `)
      .in('puzzle_number', puzzleNumbers.length > 0 ? puzzleNumbers : [0])
      .order('puzzle_number', { ascending: false });

    if (puzzlesError) {
      console.error('Error fetching puzzles:', puzzlesError);
    }

    // Calculate per-puzzle stats
    const puzzleStats = puzzleNumbers.map((puzzleNum) => {
      const puzzleCompletions = allCompletions.filter(
        (c) => c.puzzle_number === puzzleNum
      );
      const puzzleWins = puzzleCompletions.filter((c) => c.status === 'won');
      const puzzle = puzzles?.find((p) => p.puzzle_number === puzzleNum);

      return {
        puzzleNumber: puzzleNum,
        gameName: (puzzle?.games as { name: string } | undefined)?.name || `Puzzle #${puzzleNum}`,
        plays: puzzleCompletions.length,
        wins: puzzleWins.length,
        winRate: puzzleCompletions.length > 0
          ? Math.round((puzzleWins.length / puzzleCompletions.length) * 100)
          : 0,
        avgGuesses: puzzleWins.length > 0
          ? Math.round(
              (puzzleWins.reduce((sum, c) => sum + c.guess_count, 0) /
                puzzleWins.length) *
                10
            ) / 10
          : 0,
      };
    }).sort((a, b) => b.puzzleNumber - a.puzzleNumber);

    return NextResponse.json({
      summary: {
        playsToday,
        playsThisWeek,
        playsThisMonth,
        winRate,
        avgGuesses,
        uniqueVisitorsToday,
        uniqueVisitorsWeek,
        uniqueVisitorsMonth,
      },
      dailyTrends,
      puzzleStats: puzzleStats.slice(0, 30), // Last 30 puzzles
    });
  } catch (error) {
    return handleApiError(error, 'Fetch play analytics');
  }
}
