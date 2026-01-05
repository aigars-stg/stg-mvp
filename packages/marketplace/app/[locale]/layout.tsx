import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';
import Link from 'next/link';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';
import { SkipLink } from '@/components/layout/SkipLink';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';

// Lazy load BottomNav - it's only visible on mobile and can be deferred
const BottomNav = dynamic(() => import('@/components/layout/BottomNav').then(mod => ({ default: mod.BottomNav })), {
  ssr: false,
});

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

// JSON-LD Structured Data
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Second Turn Games',
  alternateName: 'STG',
  url: baseUrl,
  description: 'The Baltic marketplace for pre-owned board games. Buy, sell, and discover games in Latvia, Estonia, and Lithuania.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${baseUrl}/browse?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Second Turn Games',
  url: baseUrl,
  logo: `${baseUrl}/images/logo.png`,
  description: 'Every game deserves a second turn. The Baltic marketplace for pre-loved board games.',
  areaServed: [
    { '@type': 'Country', name: 'Latvia' },
    { '@type': 'Country', name: 'Estonia' },
    { '@type': 'Country', name: 'Lithuania' },
  ],
  sameAs: [],
};

// Generate static params for both locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Generate locale-aware metadata
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games'),
    title: {
      default: t('title'),
      template: '%s | Second Turn Games',
    },
    description: t('description'),
    keywords: t('keywords').split(', '),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `https://www.secondturn.games${locale === 'en' ? '' : `/${locale}`}`,
      languages: {
        'en': 'https://www.secondturn.games',
        'lv': 'https://www.secondturn.games/lv',
        'x-default': 'https://www.secondturn.games',
      },
    },
    openGraph: {
      title: 'Second Turn Games',
      description: t('description'),
      url: `https://www.secondturn.games${locale === 'en' ? '' : `/${locale}`}`,
      siteName: 'Second Turn Games',
      locale: locale === 'lv' ? 'lv_LV' : 'en_GB',
      alternateLocale: locale === 'lv' ? 'en_GB' : 'lv_LV',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Second Turn Games',
      description: t('description'),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  // Await params (Next.js 15 requirement)
  const { locale } = await params;

  // REQUIRED: Enable static rendering for this locale
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();

  // Get footer translations
  const tFooter = await getTranslations({ locale, namespace: 'Footer' });
  const currentYear = new Date().getFullYear();

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#D08770" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Second Turn" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ScrollToTop />
            <SkipLink />
            <Navbar />

          {/* Main Content */}
          <main id="main-content" className="min-h-screen bg-bg pb-20 lg:pb-0">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-bg-elevated border-t border-border-subtle mt-12 sm:mt-24 pb-20 lg:pb-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
                <div className="md:col-span-2">
                  <img src="/images/logo_nav.svg" alt="Second Turn Games" className="h-10 mb-3 sm:mb-4" />
                  <p className="text-sm text-text-secondary">
                    {tFooter('tagline.line1')}
                    <br />
                    {tFooter('tagline.line2')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-polar-night mb-2 sm:mb-3">{tFooter('sections.marketplace')}</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li><Link href="/browse" className="hover:text-text">{tFooter('links.browseGames')}</Link></li>
                    <li><Link href="/sell" className="hover:text-text">{tFooter('links.sellGame')}</Link></li>
                    <li><Link href="/wanted/new" className="hover:text-text">{tFooter('links.requestGame')}</Link></li>
                    <li><Link href="/help/grading-guide" className="hover:text-text">{tFooter('links.conditionGuide')}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-polar-night mb-2 sm:mb-3">{tFooter('sections.legal')}</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li><Link href="/privacy" className="hover:text-text">{tFooter('links.privacyPolicy')}</Link></li>
                    <li><Link href="/terms" className="hover:text-text">{tFooter('links.termsOfService')}</Link></li>
                    <li><Link href="/seller/terms" className="hover:text-text">{tFooter('links.sellerTerms')}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-polar-night mb-2 sm:mb-3">{tFooter('sections.contact')}</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li><a href="mailto:info@secondturn.games" className="hover:text-text">info@secondturn.games</a></li>
                    <li>{tFooter('company.name')}</li>
                    <li>{tFooter('company.regNumber')}</li>
                    <li>{tFooter('company.location')}</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border-subtle text-center text-xs sm:text-sm text-text-secondary space-y-4">
                <div className="flex justify-center mb-4">
                  <LocaleSwitcher variant="buttons" />
                </div>
                <p>{tFooter('copyright', { year: currentYear })}</p>
              </div>
            </div>
          </footer>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
