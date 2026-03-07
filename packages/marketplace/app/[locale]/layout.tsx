import type { Metadata } from 'next';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import NextTopLoader from 'nextjs-toploader';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';
import { Link } from '@/i18n/navigation';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';
import { SkipLink } from '@/components/layout/SkipLink';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';

// Lazy load BottomNav - it's only visible on mobile and can be deferred
const BottomNav = dynamic(() => import('@/components/layout/BottomNav').then(mod => ({ default: mod.BottomNav })), {
  ssr: false,
});

// Lazy load FeedbackButton - non-critical UI element
const FeedbackButton = dynamic(() => import('@/components/feedback/FeedbackButton').then(mod => ({ default: mod.FeedbackButton })), {
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
  legalName: 'Second Turn Games SIA',
  url: baseUrl,
  logo: `${baseUrl}/images/logo_nav.svg`,
  description: 'Every game deserves a second turn. The Baltic marketplace for pre-loved board games.',
  foundingDate: '2025',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Riga',
    addressCountry: 'LV',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@secondturn.games',
    contactType: 'customer service',
    availableLanguage: ['English', 'Latvian'],
  },
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
        <meta name="msapplication-TileColor" content="#D08770" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" sizes="48x48" href="/favicon.ico" />
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
        <NextTopLoader
          color="#D08770"
          height={3}
          showSpinner={false}
          crawlSpeed={200}
          speed={200}
          easing="ease"
          zIndex={9999}
        />
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                <div className="md:col-span-2">
                  <Image src="/images/logo_nav.svg" alt="Second Turn Games" width={160} height={40} className="h-10 w-auto mb-3 sm:mb-4" />
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
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-polar-night mb-2 sm:mb-3">{tFooter('sections.resources')}</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li><Link href="/help" className="hover:text-text">{tFooter('links.helpCentre')}</Link></li>
                    <li><Link href="/legal" className="hover:text-text">{tFooter('links.legalHub')}</Link></li>
                  </ul>
                </div>
              </div>

              {/* Newsletter & Partners */}
              <div className="mt-4 sm:mt-6 pt-3 border-t border-border-subtle">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="max-w-md">
                    <NewsletterSignup />
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                    <p className="text-xs text-text-muted shrink-0">
                      {tFooter('sections.partners')}
                    </p>
                    <div className="flex flex-wrap items-center gap-6">
                    <a
                      href="https://boardgamegeek.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      aria-label="Game data powered by BoardGameGeek"
                    >
                      <Image
                        src="/images/powered-by-bgg-rgb.svg"
                        alt="Powered by BoardGameGeek"
                        className="h-6 w-auto"
                        width={120}
                        height={24}
                      />
                    </a>
                    <a
                      href="https://swedbank.lv/business/cash/cashflow/paymentPortal?language=ENG"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      aria-label="Payments by EveryPay"
                    >
                      <Image
                        src="/images/everypay_logo.svg"
                        alt="EveryPay"
                        className="h-8 w-auto"
                        width={80}
                        height={32}
                      />
                    </a>
                    <a
                      href="https://unisend.lv"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      aria-label="Shipping by Unisend"
                    >
                      <Image
                        src="/images/unisend_logo.svg"
                        alt="Unisend"
                        className="h-3 w-auto"
                        width={60}
                        height={12}
                      />
                    </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* EveryPay/Swedbank compliance strip */}
              <div className="mt-4 sm:mt-6 pt-3 border-t border-border-subtle">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
                  <p>{tFooter('copyright', { year: currentYear })}</p>
                  <div className="flex items-center gap-3">
                    <nav aria-label="Payment compliance" className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-1">
                      <Link href="/legal#about-us" className="hover:text-text-secondary px-1.5 py-0.5">{tFooter('compliance.contactUs')}</Link>
                      <span className="hidden sm:inline text-border-subtle" aria-hidden="true">|</span>
                      <Link href="/legal/terms" className="hover:text-text-secondary px-1.5 py-0.5">{tFooter('links.termsOfService')}</Link>
                      <span className="hidden sm:inline text-border-subtle" aria-hidden="true">|</span>
                      <Link href="/help/shipping" className="hover:text-text-secondary px-1.5 py-0.5">{tFooter('compliance.delivery')}</Link>
                      <span className="hidden sm:inline text-border-subtle" aria-hidden="true">|</span>
                      <Link href="/legal/terms#6-disputes-returns-and-refunds" className="hover:text-text-secondary px-1.5 py-0.5">{tFooter('compliance.returns')}</Link>
                      <span className="hidden sm:inline text-border-subtle" aria-hidden="true">|</span>
                      <Link href="/legal/privacy" className="hover:text-text-secondary px-1.5 py-0.5">{tFooter('links.privacyPolicy')}</Link>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </footer>

          {/* Mobile Bottom Navigation */}
          <BottomNav />

          {/* Floating Feedback Button */}
          <FeedbackButton />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
