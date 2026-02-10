'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * Tracks the current pathname and stores it in sessionStorage.
 * Used by the offline page to redirect users back to their previous location.
 */
export function PathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track the offline page itself
    if (pathname && pathname !== '/offline') {
      sessionStorage.setItem('last_visited_path', pathname);
    }
  }, [pathname]);

  return null;
}
