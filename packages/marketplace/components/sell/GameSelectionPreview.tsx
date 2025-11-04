'use client';

import { Card } from '@second-turn/design-system';
import { getLanguageFlag } from '@/lib/bgg-utils';
import type { BGGGame, BGGVersion } from '@/lib/bgg-types';

interface GameSelectionPreviewProps {
  game: BGGGame;
  version: BGGVersion;
}

export function GameSelectionPreview({ game, version }: GameSelectionPreviewProps) {
  // Use version image if available, fallback to game image
  const imageUrl = version.image || version.thumbnail || game.image || game.thumbnail;

  return (
    <div className="mt-8 animate-fade-in">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1 flex-1 bg-gradient-to-r from-frost-ice to-transparent rounded" />
        <span className="text-sm font-medium text-text-muted">Your listing preview</span>
        <div className="h-1 flex-1 bg-gradient-to-l from-frost-ice to-transparent rounded" />
      </div>

      <Card padding="none" className="overflow-hidden border-2 border-frost-ice/20">
        <div className="flex flex-col sm:flex-row gap-0">
          {/* Game Cover */}
          <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-bg-secondary flex-shrink-0 flex items-center justify-center p-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={game.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {/* "Preview" badge */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-frost-ice text-snow-white text-xs font-semibold rounded">
              Preview
            </div>
          </div>

          {/* Game Details */}
          <div className="flex-1 p-4 sm:p-6">
            <div className="space-y-3">
              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-polar-night leading-tight">
                {game.name}
              </h3>

              {/* Version Info */}
              <div className="space-y-2">
                {/* Languages */}
                {version.languages && version.languages.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">
                      {version.languages.length > 1 ? 'Languages:' : 'Language:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {version.languages.map((lang, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-text-secondary">
                          {getLanguageFlag(lang)} {lang}
                          {idx < (version.languages?.length || 0) - 1 && (
                            <span className="text-text-muted">/</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : version.language ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Language:</span>
                    <span className="text-text-secondary">
                      {getLanguageFlag(version.language)} {version.language}
                    </span>
                  </div>
                ) : null}

                {/* Version Name (if different from game name) */}
                {version.name && version.name !== game.name && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-muted flex-shrink-0">Edition:</span>
                    <span className="text-text-secondary">{version.name}</span>
                  </div>
                )}

                {/* Publisher */}
                {version.publisher && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Publisher:</span>
                    <span className="text-text-secondary">{version.publisher}</span>
                  </div>
                )}

                {/* Year */}
                {(version.yearPublished || game.yearPublished) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Year:</span>
                    <span className="text-text-secondary">
                      {version.yearPublished || game.yearPublished}
                    </span>
                  </div>
                )}

                {/* Product Code */}
                {version.productCode && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Product Code:</span>
                    <span className="text-text-secondary font-mono text-xs">
                      {version.productCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Next Steps Hint */}
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs text-text-muted flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-frost-ice" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Next, you'll add photos, describe the condition, and set your price to complete this listing.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
