'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { GuessInput } from './GuessInput';
import { GuessCard } from './GuessCard';
import { GameResult } from './GameResult';
import { TurniReaction } from './TurniReaction';
import { getTurniWinKey, getTurniStreakKey } from '@/lib/play/turni-copy';
import { formatDate } from '@/lib/date-utils';
import { ChevronDown, ChevronUp, Calendar, Users, Scale, Time as Clock, ChevronRight, Plus } from '@/lib/icons';
import { Button } from '@second-turn/design-system';
import { formatPrice } from '@/lib/services/pricing';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  loadPlayState,
  savePlayState,
  getPuzzleState,
  addGuess,
  pruneOldPuzzles,
  hasGuessedGame,
  getWinPercentage,
  getAverageGuesses,
} from '@/lib/play/storage';
import type {
  PlayState,
  PuzzleState,
  GuessResult,
  DailyPuzzleResponse,
  GuessResponse,
  TargetGame,
} from '@/lib/play/types';
import { MAX_GUESSES } from '@/lib/play/types';

interface GameSearchResult {
  id: number;
  name: string;
  yearpublished: number | null;
  thumbnail: string | null;
}

// =============================================================================
// HELP PANEL COMPONENT
// =============================================================================

function HelpPanel() {
  const t = useTranslations('Play.help');
  const tTurni = useTranslations('Play.turni');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('title')}</h2>

      {/* Turni introduction */}
      <div className="mb-4">
        <TurniReaction mood="neutral" message={tTurni('helpIntro')} size="sm" />
      </div>

      {/* Rules */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-2">{t('howToPlay')}</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>{t('rule1')}</li>
          <li>{t('rule2')}</li>
          <li>{t('rule3')}</li>
        </ul>
      </div>

      {/* Feedback Legend */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 text-sm mb-2">{t('feedbackLegend')}</h3>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
            ✓
          </div>
          <p className="text-xs text-gray-600">{t('legendCorrect')}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-400 flex items-center justify-center text-gray-900 text-xs font-bold">
            ~
          </div>
          <p className="text-xs text-gray-600">{t('legendClose')}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold">
            ↑
          </div>
          <p className="text-xs text-gray-600">{t('legendHigher')}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold">
            ↓
          </div>
          <p className="text-xs text-gray-600">{t('legendLower')}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold">
            ✗
          </div>
          <p className="text-xs text-gray-600">{t('legendNone')}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STATS PANEL COMPONENT
// =============================================================================

interface StatsPanelProps {
  stats: PlayState['stats'];
}

function StatsPanel({ stats }: StatsPanelProps) {
  const t = useTranslations('Play');
  const tTurni = useTranslations('Play.turni');

  const winPercent = getWinPercentage(stats);
  const avgGuesses = getAverageGuesses(stats);
  const maxDistribution = Math.max(...stats.distribution, 1);
  const streakKey = getTurniStreakKey(stats.currentStreak);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('statsTitle')}</h2>

      {/* Turni streak milestone */}
      {streakKey && (
        <div className="mb-4">
          <TurniReaction
            mood="holding-meeple"
            message={tTurni(`streak.${streakKey}`)}
            size="sm"
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.played}</p>
          <p className="text-xs text-gray-500">{t('statPlayed')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{winPercent}%</p>
          <p className="text-xs text-gray-500">{t('statWinRate')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.currentStreak}</p>
          <p className="text-xs text-gray-500">{t('statCurrentStreak')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.maxStreak}</p>
          <p className="text-xs text-gray-500">{t('statMaxStreak')}</p>
        </div>
      </div>

      {/* Average Guesses */}
      {stats.won > 0 && (
        <div className="text-center mb-4 py-2 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            {t('averageGuesses')}: <span className="font-semibold text-gray-900">{avgGuesses}</span>
          </p>
        </div>
      )}

      {/* Distribution */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {t('guessDistribution')}
        </h3>
        {stats.distribution.map((count, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-3 text-xs text-gray-600">{index + 1}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-500"
                style={{
                  width: `${(count / maxDistribution) * 100}%`,
                  minWidth: count > 0 ? '16px' : '0',
                }}
              />
            </div>
            <span className="w-6 text-xs text-gray-600 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// REVEAL CARD COMPONENT
// =============================================================================

interface RevealCardProps {
  answer: TargetGame;
  puzzle: PuzzleState;
  lowestPrice: number | null;
}

function RevealCard({ answer, puzzle, lowestPrice }: RevealCardProps) {
  const t = useTranslations('Play');
  const tPrice = useTranslations('OfferCard.price');
  const tTurni = useTranslations('Play.turni');
  const hasListings = lowestPrice !== null;
  const isWin = puzzle.status === 'won';

  const cardContent = (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 ${
        hasListings ? 'hover:border-teal-300 transition-colors cursor-pointer' : ''
      }`}
    >
      {/* Turni reaction */}
      <div className="mb-4">
        {isWin ? (
          <TurniReaction
            mood="celebrating"
            message={tTurni(`win.${getTurniWinKey(puzzle.guesses.length)}`)}
            size="md"
          />
        ) : (
          <TurniReaction
            mood="supportive"
            message={tTurni('loss.reveal')}
            secondaryMessage={tTurni('loss.encourage')}
            size="md"
          />
        )}
      </div>

      {/* Horizontal layout: Image + Info */}
      <div className="flex gap-4">
        {/* Left: Game Image */}
        <div className="flex-shrink-0">
          {answer.image || answer.thumbnail ? (
            <Image
              src={answer.image || answer.thumbnail || ''}
              alt={answer.name}
              width={100}
              height={100}
              className="w-24 h-24 object-contain rounded-lg bg-gray-50"
              unoptimized
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-2xl">
              ?
            </div>
          )}
        </div>

        {/* Right: Game Info */}
        <div className="flex-1 min-w-0">
          {/* Game Name */}
          <div className="mb-2">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {answer.name}
            </h2>
          </div>

          {/* Compact stats row with icons */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {answer.yearPublished}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {answer.maxPlayers}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3" />
              {answer.weight.toFixed(1)}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {answer.playingTimeMinutes} min
            </span>
          </div>

          {/* Categories as inline badges */}
          <div className="flex flex-wrap gap-1">
            {answer.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700"
              >
                {cat}
              </span>
            ))}
            {answer.mechanics.slice(0, 2).map((mech) => (
              <span
                key={mech}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
              >
                {mech}
              </span>
            ))}
          </div>
        </div>

        {/* Price + Arrow (only when listings exist) */}
        {hasListings && (
          <div className="flex-shrink-0 flex flex-col items-end justify-center">
            <div className="text-right">
              <span className="text-xs text-gray-500">{tPrice('from')}</span>
              <p className="text-xl font-bold text-teal-600">
                {formatPrice(lowestPrice)}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
          </div>
        )}
      </div>

      {/* When no listings: Show Sell CTA */}
      {!hasListings && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            {t('noListingsYet')}
          </p>
          <Link href={`/sell?q=${encodeURIComponent(answer.name)}`}>
            <Button variant="primary" size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-1.5" />
              {t('sellThisGame')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  if (hasListings) {
    return <Link href={`/game/${answer.id}`}>{cardContent}</Link>;
  }

  return cardContent;
}

// =============================================================================
// MAIN PLAY GAME COMPONENT
// =============================================================================

export function PlayGame() {
  const t = useTranslations('Play');
  const { user } = useAuth();

  // State
  const [playState, setPlayState] = useState<PlayState | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null);
  const [puzzleDate, setPuzzleDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState<TargetGame | null>(null);
  const [guessesCollapsed, setGuessesCollapsed] = useState(false);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);

  // Current puzzle state
  const currentPuzzle: PuzzleState | null =
    playState && puzzleNumber ? getPuzzleState(playState, puzzleNumber) : null;

  const guessesRemaining = MAX_GUESSES - (currentPuzzle?.guesses.length || 0);
  const isGameOver = currentPuzzle?.status === 'won' || currentPuzzle?.status === 'lost';

  // Load initial state
  useEffect(() => {
    async function initialize() {
      try {
        // Load localStorage state
        const state = loadPlayState();
        setPlayState(state);

        // Fetch today's puzzle info
        const response = await fetch('/api/play/daily');
        if (!response.ok) throw new Error('Failed to load puzzle');

        const data: DailyPuzzleResponse = await response.json();
        setPuzzleNumber(data.puzzleNumber);
        setPuzzleDate(data.date);

        // Prune old puzzles
        const prunedState = pruneOldPuzzles(state, data.puzzleNumber);
        if (prunedState !== state) {
          setPlayState(prunedState);
          savePlayState(prunedState);
        }

        // Check if user already completed today's puzzle
        const existingPuzzle = getPuzzleState(prunedState, data.puzzleNumber);
        if (existingPuzzle?.status !== 'playing') {
          // Fetch answer for already completed puzzle
          setGuessesCollapsed(true);
          const revealResponse = await fetch(`/api/play/reveal?puzzle=${data.puzzleNumber}`);
          if (revealResponse.ok) {
            const revealResult = await revealResponse.json();
            if (revealResult.answer) {
              setRevealedAnswer(revealResult.answer);
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize game:', err);
        setError(t('errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [t]);

  // Handle guess submission
  const handleGuess = useCallback(
    async (game: GameSearchResult) => {
      if (!playState || !puzzleNumber || isSubmitting || isGameOver) return;

      // Check for duplicate guess
      if (hasGuessedGame(playState, puzzleNumber, game.id)) {
        setError(t('errors.alreadyGuessed'));
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/play/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzleNumber, gameId: game.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit guess');
        }

        const result: GuessResponse = await response.json();

        // Create guess result
        const guessResult: GuessResult = {
          gameId: result.guessedGame.id,
          gameName: result.guessedGame.name,
          thumbnail: result.guessedGame.thumbnail,
          feedback: result.feedback,
        };

        // Update state
        const newState = addGuess(playState, puzzleNumber, guessResult, result.correct);
        setPlayState(newState);
        savePlayState(newState);

        // Handle game over
        if (result.correct || newState.puzzles[puzzleNumber]?.status === 'lost') {
          // Fetch answer if not provided (for lost case)
          if (result.answer) {
            setRevealedAnswer(result.answer);
          } else {
            // Fetch answer via reveal endpoint
            const revealResponse = await fetch(`/api/play/reveal?puzzle=${puzzleNumber}`);
            if (revealResponse.ok) {
              const revealResult = await revealResponse.json();
              if (revealResult.answer) {
                setRevealedAnswer(revealResult.answer);
              }
            }
          }

          // Track completion for analytics (fire-and-forget)
          const gameStatus = result.correct ? 'won' : 'lost';
          const guessCount = newState.puzzles[puzzleNumber]?.guesses.length || 0;
          fetch('/api/play/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleNumber,
              visitorId: newState.visitorId,
              status: gameStatus,
              guessCount,
              completedAt: new Date().toISOString(),
              userId: user?.id || null,
            }),
          }).catch(() => {
            // Silently ignore tracking errors
          });

          // Collapse guesses after a short delay
          setTimeout(() => {
            setGuessesCollapsed(true);
          }, result.correct ? 1500 : 1000);
        }
      } catch (err) {
        console.error('Failed to submit guess:', err);
        setError(t('errors.submitFailed'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [playState, puzzleNumber, isSubmitting, isGameOver, t, user]
  );

  // Toggle guesses collapsed state
  const toggleGuessesCollapsed = useCallback(() => {
    setGuessesCollapsed((prev) => !prev);
  }, []);

  // Fetch lowest price when answer is revealed
  useEffect(() => {
    if (!revealedAnswer) return;

    const gameId = revealedAnswer.id;
    async function checkListings() {
      try {
        const response = await fetch(
          `/api/listings?gameId=${gameId}&limit=10&status=active`
        );
        if (response.ok) {
          const data = await response.json();
          const listings = data.listings || [];
          if (listings.length > 0) {
            // Find lowest price
            const prices = listings.map((l: { price: number }) => l.price).filter(Boolean);
            if (prices.length > 0) {
              setLowestPrice(Math.min(...prices));
            }
          }
        }
      } catch {
        // Ignore errors - just don't show pricing
      }
    }

    checkListings();
  }, [revealedAnswer]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Three-column layout on desktop, single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
        {/* Left Column - Help (hidden on mobile, shown at bottom) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <HelpPanel />
          </div>
        </aside>

        {/* Center Column - Game */}
        <main>
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('title')} #{puzzleNumber}
            </h1>
            {puzzleDate && (
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(new Date(puzzleDate))}
              </p>
            )}
          </div>

          {/* Guess Input - Sticky while playing (top-14/16 accounts for navbar height) */}
          {!isGameOver && (
            <div className="sticky top-14 sm:top-16 z-10 bg-gray-50 py-4 -mx-4 px-4 mb-2">
              <GuessInput
                onSelect={handleGuess}
                disabled={isSubmitting}
                placeholder={t('guessPlaceholder')}
              />
              {/* Guesses Remaining */}
              {currentPuzzle && (
                <p className="text-center text-gray-600 mt-3 text-sm">
                  {t('guessesRemaining', { count: guessesRemaining })}
                </p>
              )}
            </div>
          )}

          {/* Inline Game Reveal - Compact card layout */}
          {isGameOver && revealedAnswer && currentPuzzle && (
            <RevealCard
              answer={revealedAnswer}
              puzzle={currentPuzzle}
              lowestPrice={lowestPrice}
            />
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Guess Cards - Collapsible when game is over */}
          {currentPuzzle && currentPuzzle.guesses.length > 0 && (
            <div className="mb-6">
              {/* Collapse toggle header - only show when game is over */}
              {isGameOver && (
                <button
                  onClick={toggleGuessesCollapsed}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg mb-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <span>
                    {t('yourGuesses', { count: currentPuzzle.guesses.length })}
                  </span>
                  {guessesCollapsed ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronUp size={20} />
                  )}
                </button>
              )}

              {/* Guess cards - hidden when collapsed */}
              {!guessesCollapsed && (
                <div className="space-y-4">
                  {currentPuzzle.guesses.map((guess, index) => (
                    <GuessCard key={`${guess.gameId}-${index}`} guess={guess} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Game Result */}
          {isGameOver && playState && puzzleNumber && currentPuzzle && (
            <div className="mt-6">
              <GameResult puzzleNumber={puzzleNumber} puzzle={currentPuzzle} />
            </div>
          )}
        </main>

        {/* Right Column - Stats */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            {playState && <StatsPanel stats={playState.stats} />}
          </div>
        </aside>
      </div>

      {/* Mobile: Help & Stats at bottom */}
      <div className="lg:hidden mt-8 space-y-6">
        {playState && <StatsPanel stats={playState.stats} />}
        <HelpPanel />
      </div>
    </div>
  );
}
