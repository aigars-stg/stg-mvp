import { Link } from '@/i18n/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Check, AlertCircle, InfoCircle as Info } from '@/lib/icons';
import { Button, ResultPage } from '@second-turn/design-system';
import type { ResultVariant } from '@second-turn/design-system';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Unsubscribed',
    robots: 'noindex',
  };
}

type Status = 'success' | 'already' | 'error';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function UnsubscribedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = (params.status as Status) || 'success';
  const t = await getTranslations('Newsletter');

  const statusConfig: Record<Status, {
    icon: React.ReactNode;
    variant: ResultVariant;
    title: string;
    message: string;
  }> = {
    success: {
      icon: <Check className="w-8 h-8 sm:w-10 sm:h-10" />,
      variant: 'success',
      title: t('unsubscribedTitle'),
      message: t('unsubscribedMessage'),
    },
    already: {
      icon: <Info className="w-8 h-8 sm:w-10 sm:h-10" />,
      variant: 'info',
      title: t('alreadyUnsubscribedTitle'),
      message: t('alreadyUnsubscribedMessage'),
    },
    error: {
      icon: <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />,
      variant: 'error',
      title: t('unsubscribeErrorTitle'),
      message: t('unsubscribeErrorMessage'),
    },
  };

  const config = statusConfig[status] || statusConfig.success;

  return (
    <ResultPage
      variant={config.variant}
      icon={config.icon}
      title={config.title}
      description={config.message}
      fullHeight={false}
    >
      <ResultPage.Actions>
        <Link href="/" className="block">
          <Button variant="primary" fullWidth>
            {t('backToHome')}
          </Button>
        </Link>
      </ResultPage.Actions>
    </ResultPage>
  );
}
