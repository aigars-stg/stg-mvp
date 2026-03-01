'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTopLoader } from 'nextjs-toploader';

/**
 * Returns a `navigate(href)` function that starts the top-loading bar
 * before pushing to the router — same pattern used across the app.
 */
export function useNavigateWithLoader() {
  const router = useRouter();
  const loader = useTopLoader();
  return useCallback(
    (href: string) => {
      loader.start();
      router.push(href);
    },
    [loader, router]
  );
}
