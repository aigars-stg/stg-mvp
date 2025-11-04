'use client';

import { BGGError } from '@/lib/bgg-errors';

interface ErrorDisplayProps {
  error: BGGError;
  onRetry: () => void;
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  // Determine if error is retryable
  const isRetryable = ['RATE_LIMIT', 'NETWORK_ERROR', 'TIMEOUT', 'API_UNAVAILABLE'].includes(error.code);

  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="flex-1">
          {/* Error Message */}
          <h3 className="font-semibold text-red-900 mb-2">
            Unable to Search
          </h3>
          <p className="text-red-800 mb-4">
            {error.getUserMessage()}
          </p>

          {/* Specific Guidance */}
          {error.code === 'NETWORK_ERROR' && (
            <div className="bg-white border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Try these steps:</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Check your internet connection</li>
                <li>Make sure WiFi or mobile data is enabled</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          )}

          {error.code === 'RATE_LIMIT' && (
            <div className="bg-white border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-gray-700">
                BoardGameGeek is busy right now. Wait a moment and try again.
              </p>
            </div>
          )}

          {error.code === 'API_UNAVAILABLE' && (
            <div className="bg-white border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-gray-700">
                BoardGameGeek may be experiencing issues. This usually resolves quickly.
              </p>
            </div>
          )}

          {error.code === 'TIMEOUT' && (
            <div className="bg-white border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-gray-700">
                BoardGameGeek is responding slowly. Try again or wait a few minutes.
              </p>
            </div>
          )}

          {/* Retry Button */}
          {isRetryable && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          )}

          {/* Non-retryable error guidance */}
          {!isRetryable && (
            <div className="text-sm text-red-700">
              If this persists, please contact support with error code: <code className="bg-red-100 px-1 py-0.5 rounded">{error.code}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
