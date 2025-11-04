'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameImageWithBackdrop } from './GameImageWithBackdrop';

interface GameResultCardProps {
  id: number;
  name: string;
  yearpublished?: number;
  bayesaverage?: number;
  isExpansion?: boolean;
  onClick: (game: any) => void;
  hideChevron?: boolean;
  // Version details (shown when game is selected)
  versionPublisher?: string;
  versionLanguage?: string;
  versionYear?: number;
  versionThumbnail?: string;
}

export function GameResultCard({
  id,
  name,
  yearpublished,
  bayesaverage,
  isExpansion,
  onClick,
  hideChevron = false,
  versionPublisher,
  versionLanguage,
  versionYear,
  versionThumbnail,
}: GameResultCardProps) {
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
        console.log(`✅ Loaded thumbnail for ${name}${data.cached ? ' (cached)' : ''}`);
      } else {
        setHasError(true);
        console.warn(`⚠️ No thumbnail available for ${name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load thumbnail for ${name}:`, error);
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
        })
      }
      className="w-full text-left p-3 sm:p-4 rounded-lg border-2 border-border hover:border-frost-ice hover:bg-frost-ice/5 transition-all flex gap-3 sm:gap-4"
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
        <h3 className="font-semibold text-polar-night leading-tight">
          {name}
          {(versionYear || yearpublished) && (
            <span className="text-text-muted font-normal"> ({versionYear || yearpublished})</span>
          )}
        </h3>

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
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
