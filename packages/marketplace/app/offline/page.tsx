'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Button } from '@second-turn/design-system';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-aurora-orange/10 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-aurora-orange" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
            You&apos;re Offline
          </h1>
          <p className="text-text-secondary">
            {isOnline
              ? 'You&apos;re back online! Click retry to continue.'
              : 'It looks like you&apos;ve lost your internet connection. Please check your network and try again.'}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-aurora-green' : 'bg-aurora-red'
            }`}
          />
          <span className="text-text-muted">
            {isOnline ? 'Connected' : 'No connection'}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            variant={isOnline ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            onClick={handleRetry}
          >
            {isOnline ? 'Retry' : 'Try Again'}
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={handleGoHome}>
            Go to Home
          </Button>
        </div>

        {/* Tips */}
        <div className="pt-6 text-left bg-bg-elevated rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-polar-night">
            While you&apos;re offline:
          </h3>
          <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
            <li>Previously viewed listings are still accessible</li>
            <li>Your saved games and listings are cached</li>
            <li>New actions will sync when you're back online</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
