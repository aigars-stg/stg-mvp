import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import './globals.css';
import Link from 'next/link';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';
import { SkipLink } from '@/components/layout/SkipLink';
import { ScrollToTop } from '@/components/layout/ScrollToTop';

// Lazy load BottomNav - it's only visible on mobile and can be deferred
const BottomNav = dynamic(() => import('@/components/layout/BottomNav').then(mod => ({ default: mod.BottomNav })), {
  ssr: false,
});

const inter = Inter({ subsets: ['latin'] });

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games'),
  title: {
    default: 'Second Turn Games | Buy & Sell Used Board Games',
    template: '%s | Second Turn Games',
  },
  description: 'The Baltic marketplace for pre-owned board games. Buy, sell, and discover games in Latvia, Estonia, and Lithuania.',
  keywords: ['board games', 'used board games', 'galda spēles', 'lauamängud', 'stalo žaidimai', 'marketplace'],
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
  openGraph: {
    title: 'Second Turn Games',
    description: 'Every game deserves a second turn. Buy and sell used board games in the Baltics.',
    url: 'https://www.secondturn.games',
    siteName: 'Second Turn Games',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                <div>
                  <h3 className="font-semibold text-polar-night mb-3 sm:mb-4">Second Turn Games</h3>
                  <p className="text-sm text-text-secondary">
                    Every game deserves a second turn. The Baltic marketplace for pre-loved board games.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-polar-night mb-2 sm:mb-3">Marketplace</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li><Link href="/browse" className="hover:text-text">Browse Marketplace</Link></li>
                    <li><Link href="/sell" className="hover:text-text">Sell a Game</Link></li>
                    <li><Link href="/wanted/new" className="hover:text-text">Post Wanted Game</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-polar-night mb-2 sm:mb-3">Company</h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li><Link href="/privacy" className="hover:text-text">Privacy Policy</Link></li>
                    <li><Link href="/terms" className="hover:text-text">Terms of Service</Link></li>
                    <li><Link href="/seller/terms" className="hover:text-text">Seller Terms</Link></li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border-subtle text-center text-xs sm:text-sm text-text-secondary space-y-4">
                <p>© 2025 Second Turn Games. Built in the Baltics with Nordic minimalism.</p>
                <div className="flex justify-center">
                  <a
                    href="https://boardgamegeek.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img
                      src="/images/powered-by-bgg-rgb.svg"
                      alt="Powered by BoardGameGeek"
                      className="h-5 opacity-60 hover:opacity-100 transition-opacity"
                    />
                  </a>
                </div>
              </div>
            </div>
          </footer>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
