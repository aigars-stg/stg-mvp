'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw, Home, Time as Clock, AlertTriangle } from '@/lib/icons';
import { Link } from '@/i18n/navigation';
import { Button } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';

type ConnectionStatus = 'offline' | 'slow' | 'online';

interface CachedRoute {
  path: string;
  labelKey: string;
}

// Routes that are likely cached by the service worker
const CACHEABLE_ROUTES: CachedRoute[] = [
  { path: '/', labelKey: 'home' },
  { path: '/browse', labelKey: 'browse' },
  { path: '/sell', labelKey: 'sell' },
];

const AUTO_RETRY_INTERVAL = 15; // seconds

export default function OfflinePage() {
  const t = useTranslations('OfflinePage');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const [countdown, setCountdown] = useState(AUTO_RETRY_INTERVAL);
  const [isRetrying, setIsRetrying] = useState(false);
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [cachedRoutes, setCachedRoutes] = useState<CachedRoute[]>([]);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect connection quality
  const detectConnectionQuality = useCallback((): ConnectionStatus => {
    if (!navigator.onLine) return 'offline';

    // Check Network Information API if available
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection;
    if (connection) {
      const { effectiveType, downlink } = connection;
      // Slow connection: 2G, slow-2g, or very low bandwidth
      if (effectiveType === '2g' || effectiveType === 'slow-2g' || (downlink && downlink < 0.5)) {
        return 'slow';
      }
    }

    return 'online';
  }, []);

  // Check which routes are actually cached
  const checkCachedRoutes = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const availableRoutes: CachedRoute[] = [];

        for (const route of CACHEABLE_ROUTES) {
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const response = await cache.match(route.path);
            if (response) {
              availableRoutes.push(route);
              break;
            }
          }
        }

        setCachedRoutes(availableRoutes);
      } catch {
        // Cache API not available or error
        setCachedRoutes([]);
      }
    }
  }, []);

  // Get previous path from referrer or sessionStorage
  useEffect(() => {
    // Try to get the previous path
    const storedPath = sessionStorage.getItem('offline_return_path');
    if (storedPath && storedPath !== '/offline') {
      setPreviousPath(storedPath);
    } else if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        if (referrerUrl.origin === window.location.origin && referrerUrl.pathname !== '/offline') {
          setPreviousPath(referrerUrl.pathname);
        }
      } catch {
        // Invalid referrer URL
      }
    }

    // Store current path for future reference
    const currentPath = sessionStorage.getItem('last_visited_path');
    if (currentPath && currentPath !== '/offline') {
      setPreviousPath(currentPath);
    }
  }, []);

  // Monitor connection status
  useEffect(() => {
    const updateStatus = () => {
      const status = detectConnectionQuality();
      setConnectionStatus(status);

      // Auto-redirect when back online
      if (status === 'online') {
        // Small delay to ensure connection is stable
        redirectTimeoutRef.current = setTimeout(() => {
          const returnPath = previousPath || '/';
          window.location.href = returnPath;
        }, 1500);
      }
    };

    updateStatus();
    checkCachedRoutes();

    const handleOnline = () => updateStatus();
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes (if supported)
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [detectConnectionQuality, checkCachedRoutes, previousPath]);

  // Auto-retry countdown
  useEffect(() => {
    if (connectionStatus !== 'offline') {
      setCountdown(AUTO_RETRY_INTERVAL);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger retry
          handleRetry();
          return AUTO_RETRY_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      // Attempt a lightweight fetch to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      // If successful, update status and redirect
      setConnectionStatus('online');
      const returnPath = previousPath || '/';
      window.location.href = returnPath;
    } catch {
      // Still offline
      setConnectionStatus('offline');
      setCountdown(AUTO_RETRY_INTERVAL);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoBack = () => {
    if (previousPath) {
      window.location.href = previousPath;
    } else {
      window.location.href = '/';
    }
  };

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'online':
        return {
          icon: Wifi,
          iconBg: 'bg-aurora-green/10',
          iconColor: 'text-aurora-green',
          dotColor: 'bg-aurora-green',
          title: t('status.online.title'),
          subtitle: t('status.online.subtitle'),
          statusText: t('status.online.statusText'),
        };
      case 'slow':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-aurora-yellow/10',
          iconColor: 'text-aurora-yellow',
          dotColor: 'bg-aurora-yellow',
          title: t('status.slow.title'),
          subtitle: t('status.slow.subtitle'),
          statusText: t('status.slow.statusText'),
        };
      default:
        return {
          icon: WifiOff,
          iconBg: 'bg-aurora-orange/10',
          iconColor: 'text-aurora-orange',
          dotColor: 'bg-aurora-red',
          title: t('status.offline.title'),
          subtitle: t('status.offline.subtitle'),
          statusText: t('status.offline.statusText'),
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full ${config.iconBg} flex items-center justify-center`}>
            <StatusIcon className={`w-10 h-10 ${config.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
            {config.title}
          </h1>
          <p className="text-text-secondary">
            {config.subtitle}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
            {/* Pulse animation for offline/slow states */}
            {connectionStatus !== 'online' && (
              <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.dotColor} animate-ping opacity-75`} />
            )}
          </div>
          <span className="text-text-muted">
            {config.statusText}
          </span>
          {connectionStatus === 'offline' && (
            <span className="text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('retryingIn', { seconds: countdown })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          {connectionStatus === 'online' ? (
            <div className="flex items-center justify-center gap-2 text-aurora-green">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{t('redirecting')}</span>
            </div>
          ) : (
            <>
              <Button
                variant={connectionStatus === 'slow' ? 'primary' : 'secondary'}
                size="lg"
                fullWidth
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('checkingConnection')}
                  </span>
                ) : (
                  t('tryAgain')
                )}
              </Button>
              <Button variant="ghost" size="md" fullWidth onClick={handleGoBack}>
                <Home className="w-4 h-4 mr-2" />
                {previousPath ? t('goBack') : t('goHome')}
              </Button>
            </>
          )}
        </div>

        {/* Cached Routes */}
        {cachedRoutes.length > 0 && connectionStatus !== 'online' && (
          <div className="pt-4 text-left bg-bg-elevated rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-polar-night">
              {t('availableOffline')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {cachedRoutes.map((route) => (
                <Link
                  key={route.path}
                  href={route.path}
                  className="px-3 py-1.5 text-sm bg-bg rounded-full border border-frost-gray hover:border-aurora-green transition-colors"
                >
                  {t(`routes.${route.labelKey}`)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {connectionStatus !== 'online' && (
          <div className="pt-2 text-left bg-bg-elevated rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-polar-night">
              {t('tips.title')}
            </h3>
            <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
              <li>{t('tips.tip1')}</li>
              <li>{t('tips.tip2')}</li>
              <li>{t('tips.tip3')}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
