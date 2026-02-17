import { Search } from '@/lib/icons';
import { Button, ResultPage } from '@second-turn/design-system';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Locale-scoped not-found page — renders inside the locale layout (navbar, footer visible).
 * Triggered by notFound() calls or unmatched route segments within a locale.
 */
export default async function NotFound() {
  const t = await getTranslations('NotFoundPage');

  return (
    <ResultPage
      variant="info"
      icon={<Search className="w-8 h-8 sm:w-10 sm:h-10" />}
      title={t('title')}
      description={t('description')}
      fullHeight={false}
    >
      <ResultPage.Actions>
        <Link href="/browse" className="block">
          <Button variant="primary" fullWidth>
            {t('browseGames')}
          </Button>
        </Link>
        <Link href="/" className="block">
          <Button variant="secondary" fullWidth>
            {t('goHome')}
          </Button>
        </Link>
      </ResultPage.Actions>
    </ResultPage>
  );
}
