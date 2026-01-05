'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy wanted listings browse page
 * Redirects to unified browse page with wanted tab
 */
export default function WantedPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified browse page with wanted tab
    router.replace('/browse?type=wanted');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-aurora-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
