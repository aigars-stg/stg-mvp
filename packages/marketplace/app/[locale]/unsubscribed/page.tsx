import { Link } from '@/i18n/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Check, AlertCircle, InfoCircle as Info } from 'griddy-icons';

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

  const statusConfig = {
    success: {
      icon: Check,
      iconColor: 'text-aurora-green',
      bgColor: 'bg-aurora-green/10',
      title: t('unsubscribedTitle'),
      message: t('unsubscribedMessage'),
    },
    already: {
      icon: Info,
      iconColor: 'text-frost-ice',
      bgColor: 'bg-frost-ice/10',
      title: t('alreadyUnsubscribedTitle'),
      message: t('alreadyUnsubscribedMessage'),
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-aurora-red',
      bgColor: 'bg-aurora-red/10',
      title: t('unsubscribeErrorTitle'),
      message: t('unsubscribeErrorMessage'),
    },
  };

  const config = statusConfig[status] || statusConfig.success;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-bg py-12 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
        <div
          className={`w-16 h-16 mx-auto rounded-full ${config.bgColor} flex items-center justify-center mb-6`}
        >
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-4">
          {config.title}
        </h1>

        <p className="text-text-secondary mb-8">
          {config.message}
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-frost-ice text-polar-night font-medium rounded-md hover:bg-frost-polar transition-colors"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  );
}
