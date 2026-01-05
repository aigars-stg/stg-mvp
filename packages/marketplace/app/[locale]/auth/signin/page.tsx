'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy signin page - redirects to the new unified /auth page.
 * Kept for backwards compatibility with existing links and bookmarks.
 */
export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    // Preserve any redirect parameters
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirectTo');
    const newUrl = redirectTo
      ? `/auth?redirectTo=${encodeURIComponent(redirectTo)}`
      : '/auth';
    router.replace(newUrl);
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-frost-ice border-t-transparent mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
