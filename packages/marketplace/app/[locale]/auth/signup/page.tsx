'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Legacy signup page - redirects to the new unified /auth page.
 * Kept for backwards compatibility with existing links and bookmarks.
 *
 * Note: Coming Soon mode is still handled here to show the lockout screen.
 */
export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations('Auth');

  // Check if site is in "coming soon" mode
  const isComingSoon = false;

  useEffect(() => {
    // Don't redirect in coming soon mode - show the lockout screen instead
    if (!isComingSoon) {
      router.replace('/auth');
    }
  }, [router, isComingSoon]);

  // If in coming soon mode, show a message instead
  if (isComingSoon) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-frost-ice/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-frost-ice"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-polar-night mb-2">
              {t('comingSoon.title')}
            </h2>
            <p className="text-text-secondary mb-6">
              {t('comingSoon.subtitle')}
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/">
              <Button variant="primary" fullWidth>
                {t('comingSoon.exploreButton')}
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="secondary" fullWidth>
                {t('comingSoon.signInButton')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-frost-ice border-t-transparent mx-auto mb-4" />
        <p className="text-text-secondary">{t('redirect.message')}</p>
      </div>
    </div>
  );
}
