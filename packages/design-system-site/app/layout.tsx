import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Second Turn Games Design System',
  description: 'Nordic-minimalist design system for the Baltic board game marketplace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex">
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-bg-elevated border-r border-border-subtle fixed h-screen overflow-y-auto">
            <div className="p-6">
              <Link href="/" className="block mb-6">
                <h1 className="text-xl font-bold text-frost-ice">
                  Second Turn Games
                </h1>
                <p className="text-sm text-text-secondary">Design System</p>
              </Link>

              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-8 px-3 py-2 text-sm text-frost-ice hover:text-frost-sky hover:bg-frost-ice/5 rounded-md transition-colors border border-frost-ice/20"
              >
                ← View Marketplace
              </a>

              <nav className="space-y-6">
                {/* Getting Started */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                    Getting Started
                  </h3>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Introduction
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/getting-started/installation"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Installation
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Design Tokens */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                    Design Tokens
                  </h3>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/tokens/colors"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Colors
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/tokens/typography"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Typography
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/tokens/spacing"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Spacing
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/tokens/shadows"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Shadows
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Components */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                    Components
                  </h3>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/components/button"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Button
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/components/card"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Card
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/components/badge"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Badge
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/components/input"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Input
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/components/select"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Select
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/components/checkbox"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Checkbox
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/components/modal"
                        className="block px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-snow-stormLight rounded-md transition-colors"
                      >
                        Modal
                      </Link>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 ml-64">
            <div className="max-w-6xl mx-auto px-8 py-12">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
