import { Search } from 'griddy-icons';
import { Button } from '@second-turn/design-system';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

/**
 * Locale-scoped not-found page — renders inside the locale layout (navbar, footer visible).
 * Triggered by notFound() calls or unmatched route segments within a locale.
 */
export default async function NotFound() {
  const t = await getTranslations('NotFoundPage');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-frost-ice/10 flex items-center justify-center">
            <Search className="w-10 h-10 text-frost-ice" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
            {t('title')}
          </h1>
          <p className="text-text-secondary">
            {t('description')}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Link href="/browse">
            <Button variant="primary" size="lg" fullWidth>
              {t('browseGames')}
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="md" fullWidth>
              {t('goHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
