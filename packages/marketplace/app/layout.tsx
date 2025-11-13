'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Button } from '@second-turn/design-system';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { UserMenu } from '@/components/layout/UserMenu';
import { ConditionalAnalytics } from '@/components/ConditionalAnalytics';
import { CookieConsent } from '@/components/CookieConsent';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
        {/* Header */}
        <header className="bg-bg-elevated border-b border-border-subtle sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              {/* Mobile Logo */}
              <img
                src="/images/logo_nav_mobile.svg"
                alt="Second Turn Games"
                className="h-8 w-auto md:hidden"
              />
              {/* Desktop Logo */}
              <img
                src="/images/logo_nav.svg"
                alt="Second Turn Games"
                className="h-10 w-auto hidden md:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/browse" className="text-text-secondary hover:text-text transition-colors">
                Browse Games
              </Link>
              <Link href="/sell" className="text-text-secondary hover:text-text transition-colors">
                Sell a Game
              </Link>
              <Link href="/wanted/new" className="text-text-secondary hover:text-text transition-colors">
                Post Wanted Game
              </Link>
              <UserMenu />
            </nav>

            {/* Mobile Navigation Button */}
            <button
              className="md:hidden p-2 text-text hover:text-frost-ice transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border-subtle bg-bg-elevated">
              <nav className="px-4 py-4 space-y-3">
                <Link
                  href="/browse"
                  className="block py-3 text-text-secondary hover:text-text transition-colors text-base"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Browse Games
                </Link>
                <Link
                  href="/sell"
                  className="block py-3 text-text-secondary hover:text-text transition-colors text-base"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sell a Game
                </Link>
                <Link
                  href="/wanted/new"
                  className="block py-3 text-text-secondary hover:text-text transition-colors text-base"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Post Wanted Game
                </Link>
                <div className="pt-3">
                  <UserMenu />
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="min-h-screen bg-bg">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-bg-elevated border-t border-border-subtle mt-12 sm:mt-24">
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
                  <li><Link href="/browse" className="hover:text-text">Browse Games</Link></li>
                  <li><Link href="/sell" className="hover:text-text">Sell a Game</Link></li>
                  <li><Link href="/wanted/new" className="hover:text-text">Post Wanted Game</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-polar-night mb-2 sm:mb-3">Company</h4>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li><Link href="/privacy" className="hover:text-text">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-text">Terms of Service</Link></li>
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
        </AuthProvider>
        <ConditionalAnalytics />
        <CookieConsent />
      </body>
    </html>
  );
}
