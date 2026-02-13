import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  CompactHero,
  HomepageBrowse,
} from '@/components/home';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `https://www.secondturn.games${locale === 'en' ? '' : `/${locale}`}`,
    },
  };
}

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Compact Hero */}
      <CompactHero />

      {/* Recently Listed Games */}
      <HomepageBrowse />
    </div>
  );
}
