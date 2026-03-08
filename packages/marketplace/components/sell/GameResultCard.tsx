'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LinkExternal as ExternalLink, PuzzlePiece as Puzzle } from '@/lib/icons';
import { GameImageWithBackdrop } from './GameImageWithBackdrop';

interface GameResultCardProps {
  id: number;
  name: string;
  yearpublished?: number;
  bayesaverage?: number;
  isExpansion?: boolean;
  onClick: (game: { id: number; name: string; yearPublished?: number; thumbnail: string | null; matchedAlternateName?: string }) => void;
  hideChevron?: boolean;
  // Version details (shown when game is selected)
  versionPublisher?: string;
  versionLanguage?: string;
  versionYear?: number;
  versionThumbnail?: string;
  // Matched alternate name (from search) - shown as primary with name as subtitle
  matchedAlternateName?: string;
}

export function GameResultCard({
  id,
  name,
  yearpublished,
  bayesaverage: _bayesaverage,
  isExpansion,
  onClick,
  hideChevron = false,
  versionPublisher,
  versionLanguage,
  versionYear,
  versionThumbnail,
  matchedAlternateName,
}: GameResultCardProps) {
  const t = useTranslations('Sell.GameSearch');
  // Determine display name - show matched alternate name as primary if provided
  const displayName = matchedAlternateName || name;
  const subtitleName = matchedAlternateName ? name : null;
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasAttemptedLoad = useRef(false);

  useEffect(() => {
    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When card becomes visible, fetch thumbnail
          if (
            entry.isIntersecting &&
            !thumbnail &&
            !isLoading &&
            !hasError &&
            !hasAttemptedLoad.current
          ) {
            loadThumbnail();
            hasAttemptedLoad.current = true;
            // Stop observing after we start loading
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before card is visible
      }
    );

    if (cardRef.current) {
      observerRef.current.observe(cardRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  const loadThumbnail = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch(`/api/games/${id}/thumbnail`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.thumbnail) {
        setThumbnail(data.thumbnail);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      ref={cardRef}
      onClick={() =>
        onClick({
          id,
          name,
          yearPublished: yearpublished, // Map to camelCase for BGGGame interface
          thumbnail,
          matchedAlternateName, // Preserve for auto-selection of display name
        })
      }
      className="w-full text-left p-3 rounded-lg border border-border hover:border-frost-ice hover:bg-frost-ice/5 transition-all flex gap-3"
    >
      {/* Thumbnail with Color Backdrop */}
      <GameImageWithBackdrop
        src={versionThumbnail || thumbnail}
        alt={name}
        isLoading={!versionThumbnail && isLoading}
        hasError={!versionThumbnail && hasError}
      />

      {/* Game Info */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-polar-night leading-tight">
            {displayName}
            {/* Year display logic:
                - If showing localized name + version selected: year with localized name
                - If showing localized name + no version: year with subtitle (base game context)
                - If no localized name: year with primary name
            */}
            {(versionYear || (!subtitleName && yearpublished)) && (
              <span className="text-text-muted font-normal"> ({versionYear || yearpublished})</span>
            )}
          </h3>
          <a
            href={`https://boardgamegeek.com/boardgame/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-text-muted hover:text-frost-ice transition-colors flex-shrink-0"
            title="View on BoardGameGeek"
            aria-label="View on BoardGameGeek"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Subtitle: Show English name when displaying matched alternate name
            Only show year if no version year (for base game context in search results) */}
        {subtitleName && (
          <p className="text-xs text-text-muted truncate">
            {subtitleName}
            {!versionYear && yearpublished && ` (${yearpublished})`}
          </p>
        )}

        {/* Expansion Badge */}
        {isExpansion && (
          <span className="inline-flex items-center gap-1 text-xs text-aurora-purple mt-0.5">
            <Puzzle className="w-3 h-3" />
            {t('expansion')}
          </span>
        )}

        {/* Version Details - Language • Publisher */}
        {(versionLanguage || versionPublisher) && (
          <p className="text-sm text-text-secondary mt-1">
            {versionLanguage}
            {versionLanguage && versionPublisher && ' • '}
            {versionPublisher}
          </p>
        )}
      </div>

      {/* Chevron */}
      {!hideChevron && (
        <div className="flex items-center text-text-muted flex-shrink-0">
          <svg
            className="w-5 h-5"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
