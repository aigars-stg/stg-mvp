import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  CompactHero,
  HomepageBrowse,
} from '@/components/home';
import { CountryPrompt, WelcomeBanner, OnboardingChecklist } from '@/components/onboarding';

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

      {/* Welcome banner + country selection for logged-in users */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 space-y-2">
        <Suspense fallback={null}>
          <WelcomeBanner />
        </Suspense>
        <CountryPrompt />
        <OnboardingChecklist />
      </div>

      {/* Recently Listed Games */}
      <HomepageBrowse />
    </div>
  );
}
