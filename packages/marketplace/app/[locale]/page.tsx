import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  HeroSection,
  GameCollection,
  WantedCollection,
  HowItWorks,
  FinalCTA,
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
      {/* Hero Section */}
      <HeroSection />

      {/* Collections - Listings and Wanted */}
      <GameCollection
        type="recently_listed"
        limit={8}
        viewAllHref="/browse?sort=newest"
      />

      <WantedCollection limit={8} />

      {/* How It Works */}
      <HowItWorks />

      {/* Final CTA */}
      <FinalCTA />
    </div>
  );
}
