import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Sell.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `https://www.secondturn.games${locale === 'en' ? '' : `/${locale}`}/sell`,
    },
  };
}

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
