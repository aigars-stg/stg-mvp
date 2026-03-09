'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw as Loader2, AlertCircle, TrendUp } from '@/lib/icons';
import { Button } from '@second-turn/design-system';
import { useAuth } from '@/lib/auth/AuthContext';

interface PlayAnalytics {
  summary: {
    playsToday: number;
    playsThisWeek: number;
    playsThisMonth: number;
    winRate: number;
    avgGuesses: number;
    uniqueVisitorsToday: number;
    uniqueVisitorsWeek: number;
    uniqueVisitorsMonth: number;
  };
  dailyTrends: Array<{
    date: string;
    plays: number;
    wins: number;
    uniquePlayers: number;
  }>;
  puzzleStats: Array<{
    puzzleNumber: number;
    gameName: string;
    plays: number;
    wins: number;
    winRate: number;
    avgGuesses: number;
  }>;
}

export default function StaffPlayPage() {
  const { user } = useAuth();

  const [data, setData] = useState<PlayAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/staff/play-analytics');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch play analytics');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load play analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user?.id, fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading play analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">{error}</h2>
          <Button variant="primary" onClick={fetchAnalytics}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Players Today</p>
            <p className="text-2xl font-bold text-polar-night">
              {data?.summary.uniqueVisitorsToday || 0}
            </p>
          </div>
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Plays Today</p>
            <p className="text-2xl font-bold text-polar-night">
              {data?.summary.playsToday || 0}
            </p>
          </div>
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Win Rate</p>
            <p className="text-2xl font-bold text-polar-night">
              {data?.summary.winRate || 0}%
            </p>
          </div>
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Avg Guesses</p>
            <p className="text-2xl font-bold text-polar-night">
              {data?.summary.avgGuesses || 0}
            </p>
          </div>
        </div>

        {/* Extended Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-2">This Week</p>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Players</span>
              <span className="font-medium text-polar-night">
                {data?.summary.uniqueVisitorsWeek || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Plays</span>
              <span className="font-medium text-polar-night">
                {data?.summary.playsThisWeek || 0}
              </span>
            </div>
          </div>
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-2">This Month</p>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Players</span>
              <span className="font-medium text-polar-night">
                {data?.summary.uniqueVisitorsMonth || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Plays</span>
              <span className="font-medium text-polar-night">
                {data?.summary.playsThisMonth || 0}
              </span>
            </div>
          </div>
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-2">Overall</p>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Total Puzzles</span>
              <span className="font-medium text-polar-night">
                {data?.puzzleStats.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Trends */}
        {data?.dailyTrends && data.dailyTrends.length > 0 && (
          <div className="bg-snow-white border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-polar-night mb-4">
              Daily Activity (Last 30 Days)
            </h3>
            <div className="h-32 flex items-end gap-1">
              {(() => {
                const maxPlays = Math.max(...data.dailyTrends.map(d => d.plays), 1);
                return data.dailyTrends.map((day) => {
                const height = (day.plays / maxPlays) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-frost-ice/60 hover:bg-frost-ice rounded-t transition-colors cursor-default group relative"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day.date}: ${day.plays} plays, ${day.wins} wins`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-polar-night text-snow-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {day.date.slice(5)}: {day.plays} plays
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </div>
        )}

        {/* Puzzle Performance Table */}
        {data?.puzzleStats && data.puzzleStats.length > 0 && (
          <div className="bg-snow-white border border-border rounded-lg overflow-hidden">
            <h3 className="text-sm font-semibold text-polar-night p-4 border-b border-divider-subtle">
              Puzzle Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-secondary border-b border-divider-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Game
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Plays
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Avg Guesses
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider-subtle">
                  {data.puzzleStats.map((puzzle) => (
                    <tr key={puzzle.puzzleNumber} className="hover:bg-frost-ice/5 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-polar-night">
                        {puzzle.puzzleNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-polar-night">
                        {puzzle.gameName}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-polar-night">
                        {puzzle.plays}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-polar-night">
                        {puzzle.winRate}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-polar-night">
                        {puzzle.avgGuesses || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!data || data.summary.playsThisMonth === 0) && (
          <div className="text-center py-12">
            <TrendUp className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">No play data yet</p>
            <p className="text-sm text-text-muted mt-1">
              Data will appear once users start playing Galda Spēle
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
